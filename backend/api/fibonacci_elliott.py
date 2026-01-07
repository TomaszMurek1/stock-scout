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
from services.basket_resolver import resolve_baskets_to_companies
from services.company_filter_service import filter_by_market_cap

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
    
    # Needs at least 6 points: P0 (Start) + P1..P5
    while i + 5 < len(p):
        # P0 is the start of the sequence (e.g. start of Wave 1)
        # P1 is end of Wave 1
        # P2 is end of Wave 2
        # P3 is end of Wave 3
        # P4 is end of Wave 4
        # P5 is end of Wave 5
        
        p0, p1, p2, p3, p4, p5 = p[i], p[i+1], p[i+2], p[i+3], p[i+4], p[i+5]
        
        # Determine direction based on Wave 1 (P0 -> P1)
        up = p1.price > p0.price
        
        # Validate wave structure/direction
        # P2 should be corrective to P1
        # P3 should be impulsive in direction of P1
        # P4 should be corrective to P3
        # P5 should be impulsive in direction of P3
        
        valid_direction = (
            (p2.price < p1.price and p3.price > p2.price and p4.price < p3.price and p5.price > p4.price) if up else
            (p2.price > p1.price and p3.price < p2.price and p4.price > p3.price and p5.price < p4.price)
        )
        
        if not valid_direction:
            i += 1
            continue

        # Wave Lengths
        w1_len = abs(p1.price - p0.price)
        w2_len = abs(p2.price - p1.price)
        w3_len = abs(p3.price - p2.price)
        w4_len = abs(p4.price - p3.price)
        w5_len = abs(p5.price - p4.price)
        
        # Rule 1: Wave 2 cannot retrace more than 100% of Wave 1
        # (In uptrend, P2 > P0. In downtrend, P2 < P0)
        rule_2_retrace = (p2.price > p0.price) if up else (p2.price < p0.price)
        
        # Rule 2: Wave 3 cannot be the shortest impulse wave
        rule_3_not_shortest = w3_len >= min(w1_len, w5_len)
        
        # Rule 3: Wave 4 cannot enter the territory of Wave 1
        # (In uptrend, P4 > P1. In downtrend, P4 < P1)
        # Note: In commodity markets overlap is sometimes allowed, but strict rules say no.
        rule_4_overlap = (p4.price > p1.price) if up else (p4.price < p1.price)
        
        if valid_direction and rule_2_retrace and rule_3_not_shortest and rule_4_overlap:
            # Found a valid 5-wave impulse!
            # Label P1..P5
            indices = [i+1, i+2, i+3, i+4, i+5]
            labels = ["1", "2", "3", "4", "5"]
            
            for idx_offset, label in zip(indices, labels):
                lbls.append(
                    WaveLabel(
                        pivot_index=p[idx_offset].index,
                        pivot_price=p[idx_offset].price,
                        wave_label=label,
                        wave_degree=deg,
                    )
                )
            
            # Look for ABC correction (need 3 more points: P6, P7, P8)
            # Sequence: 1-2-3-4-5-A-B-C
            if i + 8 < len(p):
                p6, p7, p8 = p[i+6], p[i+7], p[i+8]
                
                # Validation for ABC
                # A goes against trend (corrective to W5)
                # B goes with trend (corrective to A)
                # C goes against trend (impulsive to A)
                
                valid_abc = (
                    (p6.price < p5.price and p7.price > p6.price and p8.price < p7.price) if up else
                    (p6.price > p5.price and p7.price < p6.price and p8.price > p7.price)
                )
                
                # Simple rule: Correction shouldn't exceed start of W5 immediately? 
                # Or just check simple directionality. 
                # Let's stick to directionality for now.
                
                if valid_abc:
                    abc_indices = [i+6, i+7, i+8]
                    abc_labels = ["A", "B", "C"]
                     
                    for idx_offset, label in zip(abc_indices, abc_labels):
                        lbls.append(
                            WaveLabel(
                                pivot_index=p[idx_offset].index,
                                pivot_price=p[idx_offset].price,
                                wave_label=label,
                                wave_degree=deg,
                            )
                        )
                    # Advance index past the ABC
                    i += 8
                else:
                    # Just advance past the 5 waves
                    i += 5
            else:
                # Advance past the 5 waves
                i += 5
        else:
            i += 1
            
    # Mark unused pivots? Or just return labeled ones.
    # The original code filled gaps with "?". Let's keep that behavior if useful for debugging,
    # or drop it for cleaner charts. 
    # Original logic:
    tagged = {l.pivot_index for l in lbls}
    for pv in p:
        if pv.index not in tagged:
            # Optional: Label P0 as "Start"? Or just pivot.
            # Only labeling unknowns if they are NOT "Start".
            # Actually, let's just return identified waves.
            pass
            
    # Sorting ensures order
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
    if not mae:
        return mets, 0.0
        
    mean_mae = np.mean(mae)
    mean_mfe = np.mean(mfe) if mfe else 0
    R = mean_mfe / mean_mae if mean_mae != 0 else 1
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
    pct: float = Query(0.05),
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


class ScanRequest(BaseModel):
    basket_ids: List[int]
    min_market_cap: float = 0
    pivot_threshold: float = 0.05
    min_kelly_fraction: float = 0.1


class ScanResultItem(BaseModel):
    ticker: str
    company_name: str
    kelly_fraction: float
    wave_count: int
    pivot_count: int
    last_wave: Optional[str] = None


class ScanResponse(BaseModel):
    data: List[ScanResultItem]


@router.post("/scan", response_model=ScanResponse)
def scan_fibonacci_elliott(
    req: ScanRequest,
    db: Session = Depends(get_db),
):
    """
    Scan multiple stocks from baskets for Elliott Wave patterns.
    Returns stocks that meet the minimum Kelly Fraction threshold.
    """
    # Get companies from the specified baskets using the resolver
    try:
        _, companies = resolve_baskets_to_companies(db, req.basket_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    
    # Apply market cap filter using the service
    if req.min_market_cap and req.min_market_cap > 0:
        companies = filter_by_market_cap(db, companies, req.min_market_cap)
    
    if not companies:
        return ScanResponse(data=[])
    
    results = []
    logger.info(f"Scanning {len(companies)} companies for Elliott Wave patterns")
    
    for company in companies:
        try:
            # Load data for the company
            df = load_data(db, company.ticker)
            
            # Detect pivots and waves
            pivots = detect_pivots(df.close, req.pivot_threshold)
            waves = label_elliott_waves(pivots)
            
            # Calculate risk metrics and Kelly Fraction
            _, kelly = compute_risk(df.close, waves)
            
            # Filter by minimum Kelly Fraction
            if kelly >= req.min_kelly_fraction:
                # Get the last wave label
                last_wave = waves[-1].wave_label if waves else None
                
                results.append(ScanResultItem(
                    ticker=company.ticker,
                    company_name=company.name,
                    kelly_fraction=kelly,
                    wave_count=len(waves),
                    pivot_count=len(pivots),
                    last_wave=last_wave,
                ))
                
        except Exception as e:
            # Log but continue scanning other stocks
            logger.warning(f"Failed to analyze {company.ticker}: {str(e)}")
            continue
    
    logger.info(f"Found {len(results)} stocks matching criteria")
    return ScanResponse(data=results)

