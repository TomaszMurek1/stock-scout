"""CLI helper to synchronize company markets via Yahoo Finance."""

from __future__ import annotations

import argparse

from database.base import SessionLocal
from services.company_market_sync import sync_company_markets


def main():
    parser = argparse.ArgumentParser(description="Sync company markets using Yahoo Finance")
    parser.add_argument("--force", action="store_true", help="Process companies even if market is already set")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of companies to process")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        result = sync_company_markets(session, force=args.force, limit=args.limit)
        print(result)
    finally:
        session.close()


if __name__ == "__main__":
    main()
