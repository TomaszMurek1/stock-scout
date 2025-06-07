import json
from database.base import get_db  # Adjust as needed
from database.company import Company  # Adjust as needed

JSON_FILE_PATH = "nyse_full_tickers.json"  # Path to your JSON file
MARKET_ID = 9
SKIPPED_LOG = "skipped_companies.log"


def main():
    db = next(get_db())

    # Load company data from JSON file
    with open(JSON_FILE_PATH, "r") as f:
        companies_data = json.load(f)

    # ---- ROBUST TICKER CHECK ----
    # If your unique constraint is only on 'ticker', get ALL existing tickers!
    existing_tickers = set(row[0] for row in db.query(Company.ticker).all())

    companies_to_add = []
    skipped_tickers = []

    for entry in companies_data:
        ticker = entry["symbol"].strip()
        if ticker in existing_tickers:
            msg = f"Skipping {ticker}: already exists."
            print(msg)
            skipped_tickers.append(msg)
            continue
        company = Company(
            name=entry["name"].strip(),
            ticker=ticker,
            sector=entry.get("sector", None),
            industry=entry.get("industry", None),
            market_id=MARKET_ID,
        )
        companies_to_add.append(company)

    # Log skipped tickers to file
    if skipped_tickers:
        with open(SKIPPED_LOG, "w") as f:
            for line in skipped_tickers:
                f.write(line + "\n")

    # Add new companies to DB
    if companies_to_add:
        db.add_all(companies_to_add)
        db.commit()
        print(f"Imported {len(companies_to_add)} new companies.")
    else:
        print("No new companies to import.")


if __name__ == "__main__":
    main()
