"""
Wyckoff Accumulation Phase Detection Service

Detects accumulation patterns based on observable price and volume facts.
Uses scoring + narrative approach without claiming to understand institutional intent.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional, Dict, List
from datetime import datetime, timedelta


def detect_trading_range(df: pd.DataFrame, lookback_days: int = 90, min_range_pct: float = 5.0, max_range_pct: float = 20.0) -> Tuple[float, Dict]:
    """
    Detect if price is trading in a horizontal range.
    
    Returns:
        score (0-100): How well defined the trading range is
        details: Dictionary with range_low, range_high, duration, touches, narrative
    """
    if len(df) < 20:
        return 0.0, {"narrative": "Insufficient data for range analysis"}
    
    # Calculate support and resistance using rolling percentiles
    window = min(30, len(df) // 3)
    support = df['Low'].rolling(window=window, center=True).quantile(0.05)
    resistance = df['High'].rolling(window=window, center=True).quantile(0.95)
    
    # Use the full lookback period for analysis
    recent_data = df.tail(lookback_days) if len(df) >= lookback_days else df
    
    range_low = recent_data['Low'].min()
    range_high = recent_data['High'].max()
    range_pct = ((range_high - range_low) / range_low) * 100
    
    # Score based on range characteristics
    score = 0.0
    
    # 1. Range width (ideal: 5-20%)
    if min_range_pct <= range_pct <= max_range_pct:
        score += 40  # Perfect range
    elif range_pct < min_range_pct:
        score += 20 * (range_pct / min_range_pct)  # Too tight
    else:
        score += 40 * (max_range_pct / range_pct)  # Too wide
    
    # 2. Count touches of support/resistance (more = better defined)
    support_level = range_low * 1.02  # 2% tolerance
    resistance_level = range_high * 0.98
    
    support_touches = ((recent_data['Low'] <= support_level)).sum()
    resistance_touches = ((recent_data['High'] >= resistance_level)).sum()
    total_touches = support_touches + resistance_touches
    
    # Award points for touches (max 30 points)
    touch_score = min(30, total_touches * 5)
    score += touch_score
    
    # 3. Duration in range (longer = better)
    duration_days = len(recent_data)
    if duration_days >= 30:
        score += 30
    else:
        score += 30 * (duration_days / 30)
    
    narrative = (
        f"Trading range of {range_pct:.1f}% established over {duration_days} days "
        f"with {support_touches} touches of support at ${range_low:.2f} "
        f"and {resistance_touches} touches of resistance at ${range_high:.2f}"
    )
    
    return min(100.0, score), {
        "range_low": range_low,
        "range_high": range_high,
        "range_pct": range_pct,
        "duration": duration_days,
        "support_touches": support_touches,
        "resistance_touches": resistance_touches,
        "narrative": narrative
    }


def analyze_volume_pattern(df: pd.DataFrame, lookback_days: int = 90) -> Tuple[float, str]:
    """
    Analyze volume characteristics for accumulation.
    
    Key patterns:
    - Declining volume during range (supply drying up)
    - Volume spikes on support tests (absorption)
    - Lower volume on rallies (lack of supply)
    """
    if len(df) < 20 or 'Volume' not in df.columns:
        return 0.0, "Insufficient volume data"
    
    score = 0.0
    observations = []
    
    # Use the full lookback period for analysis
    recent_data = (df.tail(lookback_days) if len(df) >= lookback_days else df).copy()
    
    # 1. Volume trend (declining = bullish for accumulation)
    volume_first_half = recent_data.head(len(recent_data) // 2)['Volume'].mean()
    volume_second_half = recent_data.tail(len(recent_data) // 2)['Volume'].mean()
    
    volume_change_pct = ((volume_second_half - volume_first_half) / volume_first_half) * 100
    
    if volume_change_pct < -10:  # Declining volume
        score += 35
        observations.append(f"Volume declined {abs(volume_change_pct):.1f}% (supply drying up)")
    elif volume_change_pct < 0:
        score += 20
        observations.append(f"Volume slightly declining")
    else:
        observations.append(f"Volume increasing (not ideal)")
    
    # 2. Volume on down days vs up days
    recent_data['price_change'] = recent_data['Close'].diff()
    down_days = recent_data[recent_data['price_change'] < 0]
    up_days = recent_data[recent_data['price_change'] > 0]
    
    if len(down_days) > 0 and len(up_days) > 0:
        avg_vol_down = down_days['Volume'].mean()
        avg_vol_up = up_days['Volume'].mean()
        
        # In accumulation, we want higher volume on down days (absorption)
        if avg_vol_down > avg_vol_up * 1.1:
            score += 35
            ratio = avg_vol_down / avg_vol_up
            observations.append(f"Volume {ratio:.1f}x higher on down days (absorption evident)")
        elif avg_vol_down > avg_vol_up:
            score += 20
            observations.append(f"Slightly higher volume on down days")
        else:
            observations.append(f"Higher volume on up days (distribution pattern)")
    
    # 3. Volume spikes detection
    volume_mean = recent_data['Volume'].mean()
    volume_std = recent_data['Volume'].std()
    volume_spikes = recent_data[recent_data['Volume'] > volume_mean + 2 * volume_std]
    
    if len(volume_spikes) > 0:
        score += 30
        observations.append(f"{len(volume_spikes)} volume spike(s) detected")
    
    narrative = ". ".join(observations)
    return min(100.0, score), narrative


def detect_spring(df: pd.DataFrame, range_low: float) -> Tuple[float, str]:
    """
    Detect 'Spring' - a brief break below support followed by quick recovery.
    
    A spring indicates a final shakeout before markup (Phase C).
    """
    if len(df) < 10:
        return 0.0, "Insufficient data for spring detection"
    
    recent_data = df.tail(30) if len(df) >= 30 else df
    
    # Look for price breaking below support then recovering
    support_break_threshold = range_low * 0.98  # 2% below support
    
    springs = []
    for i in range(5, len(recent_data)):
        window = recent_data.iloc[i-5:i+1]
        
        # Check if price broke below support
        if window['Low'].min() < support_break_threshold:
            # Check if it recovered above support within same window
            if window['Close'].iloc[-1] > range_low:
                spring_date = window.index[-1]
                spring_low = window['Low'].min()
                recovery_price = window['Close'].iloc[-1]
                
                springs.append({
                    'date': spring_date,
                    'low': spring_low,
                    'recovery': recovery_price
                })
    
    if springs:
        score = min(100, len(springs) * 60)  # Up to 100 for springs
        latest_spring = springs[-1]
        narrative = (
            f"Spring detected on {latest_spring['date'].strftime('%Y-%m-%d')}: "
            f"Price briefly dropped to ${latest_spring['low']:.2f} "
            f"(below support at ${range_low:.2f}) "
            f"then recovered to ${latest_spring['recovery']:.2f}"
        )
    else:
        score = 0.0
        narrative = "No spring pattern detected yet"
    
    return score, narrative


def analyze_support_tests(df: pd.DataFrame, range_low: float, lookback_days: int = 90) -> Tuple[float, str]:
    """
    Analyze tests of support showing successful holds.
    
    Multiple successful tests with decreasing volume = strength.
    """
    if len(df) < 10:
        return 0.0, "Insufficient data for support test analysis"
    
    # Use the full lookback period for analysis
    recent_data = df.tail(lookback_days) if len(df) >= lookback_days else df
    
    support_zone = range_low * 1.03  # Within 3% of support
    
    # Find all tests of support
    tests = recent_data[recent_data['Low'] <= support_zone]
    
    if len(tests) == 0:
        return 0.0, "No support tests observed"
    
    score = 0.0
    
    # 1. Number of tests (more = better)
    num_tests = len(tests)
    score += min(40, num_tests * 10)
    
    # 2. Check if lows are higher (bullish)
    if num_tests >= 2:
        first_test_low = tests.iloc[0]['Low']
        last_test_low = tests.iloc[-1]['Low']
        
        if last_test_low > first_test_low:
            score += 30
            improvement = ((last_test_low - first_test_low) / first_test_low) * 100
            observation = f"showing higher lows (+{improvement:.1f}%)"
        else:
            score += 10
            observation = "with mixed results"
    else:
        observation = ""
    
    # 3. Volume on tests
    if 'Volume' in tests.columns and len(tests) >= 2:
        first_half_vol = tests.head(len(tests) // 2)['Volume'].mean()
        second_half_vol = tests.tail(len(tests) // 2)['Volume'].mean()
        
        if second_half_vol < first_half_vol:
            score += 30
            vol_observation = ", declining volume on later tests"
        else:
            score += 10
            vol_observation = ""
    else:
        vol_observation = ""
    
    narrative = (
        f"{num_tests} test(s) of support at ${range_low:.2f} "
        f"{observation}{vol_observation}"
    )
    
    return min(100.0, score), narrative


def detect_signs_of_strength(df: pd.DataFrame, range_high: float) -> Tuple[float, str]:
    """
    Detect Signs of Strength (SOS) - wide-spread up days on high volume.
    
    Indicates demand entering the market.
    """
    if len(df) < 10:
        return 0.0, "Insufficient data for SOS detection"
    
    recent_data = (df.tail(30) if len(df) >= 30 else df).copy()
    
    # Calculate price spread and volume
    recent_data['spread'] = recent_data['High'] - recent_data['Low']
    recent_data['change'] = recent_data['Close'] - recent_data['Open']
    
    avg_spread = recent_data['spread'].mean()
    avg_volume = recent_data['Volume'].mean() if 'Volume' in recent_data.columns else 0
    
    # Find wide-spread up days on high volume
    sos_candidates = recent_data[
        (recent_data['change'] > 0) &  # Up day
        (recent_data['spread'] > avg_spread * 1.5) &  # Wide spread
        (recent_data['Volume'] > avg_volume * 1.2 if 'Volume' in recent_data.columns else True)  # High volume
    ]
    
    score = 0.0
    
    if len(sos_candidates) > 0:
        # Check if any broke above resistance
        resistance_breaks = sos_candidates[sos_candidates['High'] > range_high]
        
        if len(resistance_breaks) > 0:
            score = 100
            latest = resistance_breaks.iloc[-1]
            narrative = (
                f"Strong Sign of Strength on {latest.name.strftime('%Y-%m-%d')}: "
                f"Wide-spread up day (${latest['spread']:.2f}) "
                f"breaking above resistance at ${range_high:.2f}"
            )
        else:
            score = min(70, len(sos_candidates) * 25)
            narrative = f"{len(sos_candidates)} wide-spread up day(s) detected, approaching resistance"
    else:
        score = 0.0
        narrative = "No significant Signs of Strength detected yet"
    
    return score, narrative


def analyze_wyckoff_accumulation(df: pd.DataFrame, lookback_days: int = 90, weights: Optional[Dict] = None) -> Dict:
    """
    Main analysis function that scores all Wyckoff accumulation criteria.
    
    Args:
        df: Price/volume DataFrame
        lookback_days: Number of days to analyze
        weights: Optional custom weights dict with keys: trading_range, volume_pattern, spring, support_tests, signs_of_strength
    
    Returns:
        Dictionary with overall score, individual scores, and analysis details
    """
    # Default weights
    if weights is None:
        weights = {
            "trading_range": 0.25,
            "volume_pattern": 0.25,
            "spring": 0.20,
            "support_tests": 0.15,
            "signs_of_strength": 0.15,
        }
    
    # Ensure we have enough data
    if len(df) < 20:
        return {
            "overall_score": 0.0,
            "scores": [],
            "details": {},
            "error": "Insufficient price data"
        }
    
    # Limit to lookback period
    if len(df) > lookback_days:
        df = df.tail(lookback_days)
    
    scores_list = []
    details = {}
    
    # 1. Trading Range Detection
    range_score, range_details = detect_trading_range(df, lookback_days)
    scores_list.append({
        "criterion": "Trading Range",
        "score": range_score,
        "narrative": range_details.get("narrative", ""),
        "weight": weights["trading_range"]
    })
    details["range"] = range_details
    
    # Extract range levels for other analyses
    range_low = range_details.get("range_low", df['Low'].min())
    range_high = range_details.get("range_high", df['High'].max())
    
    # 2. Volume Characteristics
    volume_score, volume_narrative = analyze_volume_pattern(df, lookback_days)
    scores_list.append({
        "criterion": "Volume Pattern",
        "score": volume_score,
        "narrative": volume_narrative,
        "weight": weights["volume_pattern"]
    })
    
    # 3. Spring Detection
    spring_score, spring_narrative = detect_spring(df, range_low)
    scores_list.append({
        "criterion": "Spring",
        "score": spring_score,
        "narrative": spring_narrative,
        "weight": weights["spring"]
    })
    
    # 4. Support Tests
    test_score, test_narrative = analyze_support_tests(df, range_low, lookback_days)
    scores_list.append({
        "criterion": "Support Tests",
        "score": test_score,
        "narrative": test_narrative,
        "weight": weights["support_tests"]
    })
    
    # 5. Signs of Strength
    sos_score, sos_narrative = detect_signs_of_strength(df, range_high)
    scores_list.append({
        "criterion": "Signs of Strength",
        "score": sos_score,
        "narrative": sos_narrative,
        "weight": weights["signs_of_strength"]
    })
    
    # Calculate weighted overall score
    overall_score = sum(s["score"] * s["weight"] for s in scores_list)
    
    # Determine phase
    phase = determine_wyckoff_phase(range_score, spring_score, sos_score)
    
    return {
        "overall_score": round(overall_score, 1),
        "scores": scores_list,
        "details": details,
        "range_low": range_low,
        "range_high": range_high,
        "phase_detected": phase
    }


def determine_wyckoff_phase(range_score: float, spring_score: float, sos_score: float) -> str:
    """
    Determine which Wyckoff phase based on pattern evidence.
    """
    if spring_score > 60:
        return "Phase C (Spring Detected)"
    elif range_score > 60 and sos_score > 50:
        return "Late Phase B / Early Phase C"
    elif range_score > 60:
        return "Phase B (Range Building)"
    elif range_score > 30:
        return "Early Phase B (Range Forming)"
    else:
        return "Insufficient Evidence"
