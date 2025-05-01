from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.base import get_db
from database.company import Company
from database.stock_data import StockPriceHistory

logger = logging.getLogger(__name__)
router = APIRouter()


class Pivot(BaseModel):
    index: int
    date: datetime
    price: float
    kind: str


class WaveLabel(BaseModel):
    pivot_index: int
    pivot_price: float
    wave_label: str
    wave_degree: str


class WaveMetrics(BaseModel):
    wave_label: str
    start_date: datetime
    end_date: datetime
    mae: float
    mfe: float


class FiboRetracement(BaseModel):
    wave: str
    range: Tuple[int, int]
    fib_levels: Dict[float, bool]


class AnalysisResponse(BaseModel):
    candles: List[Dict]
    pivots: List[Pivot]
    waves: List[WaveLabel]
    fibo: List[FiboRetracement]
    risk: List[WaveMetrics]
    kelly_fraction: float


def load_data(
    db: Session,
    ticker: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> pd.DataFrame:
    end_date = end_date or datetime.utcnow().date()
    start_date = start_date or (end_date - timedelta(days=365))
    cmp = db.query(Company).filter(Company.ticker == ticker).first()
    if not cmp:
        raise HTTPException(status_code=404, detail=f"Unknown ticker {ticker}")
    rows = (
        db.query(StockPriceHistory)
        .filter(
            StockPriceHistory.company_id == cmp.company_id,
            StockPriceHistory.date >= start_date,
            StockPriceHistory.date <= end_date,
        )
        .order_by(StockPriceHistory.date)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No data")
    df = pd.DataFrame(
        [
            {
                "date": r.date,
                "open": r.open,
                "high": r.high,
                "low": r.low,
                "close": r.close,
                "volume": r.volume,
                "adj": r.adjusted_close,
            }
            for r in rows
        ]
    ).set_index("date")
    df.index = pd.to_datetime(df.index)
    df = df.asfreq("B")
    df[["open", "high", "low", "close", "volume"]] = df[
        ["open", "high", "low", "close", "volume"]
    ].ffill()
    if df["adj"].notna().all():
        ratio = df["adj"] / df["close"]
        df[["open", "high", "low", "close"]] = df[["open", "high", "low", "close"]].mul(
            ratio, axis=0
        )
    df.drop(columns=["adj"], errors="ignore", inplace=True)
    return df


def detect_pivots(close: pd.Series, th: float = 0.03) -> List[Pivot]:
    pivots = []
    if close.empty:
        return pivots
    p0 = close.iloc[0]
    idx = 0
    kind = "low"
    dir = 0
    for i in range(1, len(close)):
        ch = (close.iloc[i] - p0) / p0
        if dir == 0:
            if abs(ch) >= th:
                dir = 1 if ch > 0 else -1
        else:
            if (dir == 1 and close.iloc[i] > p0) or (dir == -1 and close.iloc[i] < p0):
                p0 = close.iloc[i]
                idx = i
                kind = "high" if dir == 1 else "low"
            elif abs(ch) >= th:
                pivots.append(
                    Pivot(index=idx, date=close.index[idx], price=float(p0), kind=kind)
                )
                dir *= -1
                p0 = close.iloc[i]
                idx = i
                kind = "high" if dir == 1 else "low"
    pivots.append(Pivot(index=idx, date=close.index[idx], price=float(p0), kind=kind))
    return pivots


def label_elliott_waves(p: List[Pivot]) -> List[WaveLabel]:
    lbls = []
    i = 0
    deg = "primary"
    while i + 4 < len(p):
        up = p[i + 4].price > p[i].price
        w3 = abs(p[i + 2].price - p[i + 1].price)
        w1 = abs(p[i + 1].price - p[i].price)
        w5 = abs(p[i + 4].price - p[i + 3].price)
        if w3 >= min(w1, w5) and (
            (min(p[i + 3].price, p[i + 2].price) > p[i + 1].price)
            if up
            else (max(p[i + 3].price, p[i + 2].price) < p[i + 1].price)
        ):
            for j, l in enumerate(["1", "2", "3", "4", "5"]):
                lbls.append(
                    WaveLabel(
                        pivot_index=p[i + j].index,
                        pivot_price=p[i + j].price,
                        wave_label=l,
                        wave_degree=deg,
                    )
                )
            if i + 7 < len(p):
                for k, l in zip(range(5, 8), ["A", "B", "C"]):
                    lbls.append(
                        WaveLabel(
                            pivot_index=p[i + k].index,
                            pivot_price=p[i + k].price,
                            wave_label=l,
                            wave_degree=deg,
                        )
                    )
            i += 8
        else:
            i += 1
    tagged = {l.pivot_index for l in lbls}
    for pv in p:
        if pv.index not in tagged:
            lbls.append(
                WaveLabel(
                    pivot_index=pv.index,
                    pivot_price=pv.price,
                    wave_label="?",
                    wave_degree=deg,
                )
            )
    lbls.sort(key=lambda x: x.pivot_index)
    return lbls


FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]


def calc_hits(close: pd.Series, a: int, b: int) -> Dict[float, bool]:
    lo, hi = (close.iloc[a], close.iloc[b]) if a < b else (close.iloc[b], close.iloc[a])
    seg = close.iloc[min(a, b) : max(a, b) + 1]
    return {
        f: bool(np.any(np.isclose(seg, hi - (hi - lo) * f, rtol=5e-3))) for f in FIB
    }


def calculate_fibs(close: pd.Series, lbls: List[WaveLabel]) -> List[FiboRetracement]:
    out = []
    for i, wl in enumerate(lbls):
        if wl.wave_label != "1":
            continue
        try:
            end = next(
                w
                for w in lbls[i:]
                if w.wave_label == "5" and w.wave_degree == wl.wave_degree
            )
        except StopIteration:
            continue
        out.append(
            FiboRetracement(
                wave="1-5",
                range=(wl.pivot_index, end.pivot_index),
                fib_levels=calc_hits(close, wl.pivot_index, end.pivot_index),
            )
        )
    return out


def mae_mfe(pr: pd.Series, a: int, b: int, dir: int) -> Tuple[float, float]:
    seg = pr.iloc[a : b + 1]
    if dir == 1:
        return (
            float((seg.min() - seg.iloc[0]) / seg.iloc[0]),
            float((seg.max() - seg.iloc[0]) / seg.iloc[0]),
        )
    return (
        float((seg.max() - seg.iloc[0]) / seg.iloc[0]),
        float((seg.min() - seg.iloc[0]) / seg.iloc[0]),
    )


def compute_risk(
    pr: pd.Series, lbls: List[WaveLabel]
) -> Tuple[List[WaveMetrics], float]:
    mets = []
    mae = []
    mfe = []
    for i in range(1, len(lbls)):
        a, b = lbls[i - 1], lbls[i]
        d = 1 if b.pivot_price > a.pivot_price else -1
        m1, m2 = mae_mfe(pr, a.pivot_index, b.pivot_index, d)
        mets.append(
            WaveMetrics(
                wave_label=b.wave_label,
                start_date=pr.index[a.pivot_index],
                end_date=pr.index[b.pivot_index],
                mae=m1,
                mfe=m2,
            )
        )
        mae.append(abs(m1))
        mfe.append(m2)
    p = 0.55
    R = np.mean(mfe) / np.mean(mae) if mae else 1
    kel = max(0, p - (1 - p) / R)
    return mets, round(kel, 3)


def candles(df):
    return [
        {
            "date": idx.isoformat(),
            "open": r.open,
            "high": r.high,
            "low": r.low,
            "close": r.close,
            "volume": int(r.volume) if not pd.isna(r.volume) else None,
        }
        for idx, r in df.iterrows()
    ]


@router.get("/analyze/{ticker}", response_model=AnalysisResponse)
def analyze(
    ticker: str = Path(...),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    pct: float = Query(0.03),
    db: Session = Depends(get_db),
):
    df = load_data(
        db,
        ticker,
        pd.to_datetime(start).date() if start else None,
        pd.to_datetime(end).date() if end else None,
    )
    piv = detect_pivots(df.close, pct)
    w = label_elliott_waves(piv)
    fib = calculate_fibs(df.close, w)
    risk, kel = compute_risk(df.close, w)
    return AnalysisResponse(
        candles=candles(df),
        pivots=piv,
        waves=w,
        fibo=fib,
        risk=risk,
        kelly_fraction=kel,
    )
