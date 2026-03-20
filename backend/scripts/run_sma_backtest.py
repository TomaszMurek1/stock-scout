"""
Run SMA distance backtest across all companies with sufficient history.

Usage (inside Docker):
    python scripts/run_sma_backtest.py --sma 200 --threshold 17.5
    python scripts/run_sma_backtest.py --sma 50 --threshold 10 --min-history 100
    python scripts/run_sma_backtest.py --sma 200 --threshold 17.5 --limit 5 --output results.csv

Output: prints summary table + optionally saves CSV with all signals.
"""
import sys
import os
import argparse
import logging
import time

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from sqlalchemy import text
from database.base import SessionLocal
from services.sma_backtest import (
    run_backtest_for_company,
    aggregate_results,
    DEFAULT_PERIODS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(description="SMA Distance Backtest")
    parser.add_argument("--sma", type=int, default=200, choices=[20, 50, 100, 200],
                        help="SMA period (default: 200)")
    parser.add_argument("--threshold", type=float, default=17.5,
                        help="Minimum %% distance to trigger signal (default: 17.5)")
    parser.add_argument("--cooldown", type=int, default=21,
                        help="Cooldown days between signals of same type (default: 21)")
    parser.add_argument("--min-history", type=int, default=300,
                        help="Minimum price history rows per company (default: 300)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limit processing to N companies (for testing)")
    parser.add_argument("--output", type=str, default=None,
                        help="Path to save detailed CSV (optional)")
    return parser.parse_args()


def get_eligible_companies(db, min_history: int, sma_period: int, limit: int = None):
    """Get companies with enough history and non-null SMA values."""
    sma_col = f"sma_{sma_period}"
    query = text(f"""
        SELECT company_id, COUNT(*) as row_count
        FROM stock_price_history
        WHERE {sma_col} IS NOT NULL
        GROUP BY company_id
        HAVING COUNT(*) >= :min_history
        ORDER BY company_id
    """)
    if limit:
        query = text(f"""
            SELECT company_id, COUNT(*) as row_count
            FROM stock_price_history
            WHERE {sma_col} IS NOT NULL
            GROUP BY company_id
            HAVING COUNT(*) >= :min_history
            ORDER BY company_id
            LIMIT :lim
        """)
        return db.execute(query, {"min_history": min_history, "lim": limit}).fetchall()
    return db.execute(query, {"min_history": min_history}).fetchall()


def print_summary_table(label: str, results: dict, period_order: list):
    """Print a formatted summary table."""
    if not results:
        print(f"  {label}: No signals found\n")
        return

    # Header
    print(f"  {label}")
    total_signals = sum(r.get("count", 0) for r in results.values())
    print(f"  Signals: {total_signals:,}")
    print()
    print(f"  {'Period':<8} │ {'Median Return':>13} │ {'Mean Return':>11} │ {'Win Rate':>8} │ {'P25':>7} │ {'P75':>7}")
    print(f"  {'─'*8}─┼─{'─'*13}─┼─{'─'*11}─┼─{'─'*8}─┼─{'─'*7}─┼─{'─'*7}")

    for period in period_order:
        if period not in results:
            continue
        r = results[period]
        med = f"{r['median_return']:+.1f}%"
        mean = f"{r['mean_return']:+.1f}%"
        win = f"{r['win_rate']:.0f}%"
        p25 = f"{r['p25']:+.1f}%"
        p75 = f"{r['p75']:+.1f}%"
        print(f"  {period:<8} │ {med:>13} │ {mean:>11} │ {win:>8} │ {p25:>7} │ {p75:>7}")

    print()


def main():
    args = parse_args()
    db = SessionLocal()

    try:
        # Get eligible companies
        companies = get_eligible_companies(db, args.min_history, args.sma, args.limit)
        logger.info(f"Found {len(companies)} companies with ≥{args.min_history} rows of SMA-{args.sma} data")

        if not companies:
            print("No eligible companies found. Run the backfill script first.")
            return

        # Run backtest per company
        all_above_returns = []
        all_below_returns = []
        total_signals = 0
        total_above = 0
        total_below = 0
        processed = 0
        start_time = time.time()

        for company_id, row_count in companies:
            result = run_backtest_for_company(
                db=db,
                company_id=company_id,
                sma_period=args.sma,
                threshold_pct=args.threshold,
                cooldown_days=args.cooldown,
            )

            if result is None:
                continue

            processed += 1
            total_signals += result["signals"]
            total_above += result.get("above_signals", 0)
            total_below += result.get("below_signals", 0)

            # Collect forward returns
            for fr in result.get("forward_returns", []):
                # Determine if this was from above or below signal
                sig_date = fr["signal_date"]
                for sd in result.get("signal_details", []):
                    if sd["date"] == sig_date:
                        fr["signal_type"] = sd["signal_type"]
                        fr["pct_distance"] = sd["pct_distance"]
                        fr["company_id"] = company_id
                        break

                if fr.get("signal_type") == "above":
                    all_above_returns.append(fr)
                elif fr.get("signal_type") == "below":
                    all_below_returns.append(fr)

            if processed % 100 == 0:
                elapsed = time.time() - start_time
                logger.info(f"Processed {processed}/{len(companies)} companies ({elapsed:.0f}s)")

        elapsed = time.time() - start_time

        # Get date range
        date_range = db.execute(text("""
            SELECT MIN(date), MAX(date) FROM stock_price_history
        """)).fetchone()

        # --- Print results ---
        print()
        print("═" * 65)
        print(f"  SMA {args.sma} Distance Backtest — Threshold: ≥{args.threshold}%")
        print(f"  Companies: {processed:,}  |  Signals: {total_signals:,}  |  "
              f"Date range: {date_range[0]}–{date_range[1]}")
        print(f"  Runtime: {elapsed:.1f}s")
        print("═" * 65)
        print()

        period_order = list(DEFAULT_PERIODS.keys())

        # Above SMA
        above_df = pd.DataFrame(all_above_returns) if all_above_returns else pd.DataFrame()
        above_agg = aggregate_results(above_df) if not above_df.empty else {}
        print_summary_table(
            f"ABOVE SMA (price ≥ {args.threshold}% above SMA {args.sma})",
            above_agg, period_order
        )

        # Below SMA
        below_df = pd.DataFrame(all_below_returns) if all_below_returns else pd.DataFrame()
        below_agg = aggregate_results(below_df) if not below_df.empty else {}
        print_summary_table(
            f"BELOW SMA (price ≥ {args.threshold}% below SMA {args.sma})",
            below_agg, period_order
        )

        # Save CSV if requested
        if args.output:
            all_returns = all_above_returns + all_below_returns
            if all_returns:
                out_df = pd.DataFrame(all_returns)
                out_df.to_csv(args.output, index=False)
                print(f"  Detailed results saved to: {args.output}")
                print(f"  Total signal records: {len(out_df):,}")
            else:
                print("  No signals to save.")

        print()

    finally:
        db.close()


if __name__ == "__main__":
    main()
