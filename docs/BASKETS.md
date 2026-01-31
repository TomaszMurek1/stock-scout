# Market Baskets Documentation

## Overview
Baskets in Stock Scout are collections of companies used for technical analysis scans, price history tracking, and portfolio organization. There are two main types of baskets:
1.  **Smart Baskets (Dynamic)**: Automatically populated based on rules.
2.  **Legacy/Custom Baskets (Static)**: Manually managed lists of companies.

---

## 1. Smart Baskets (Dynamic)
Smart baskets use the `rules` column in the `baskets` table (JSONB) to determine which companies belong to them. This ensures the baskets are always up-to-date as new companies are added to the system.

### JSON Rules Schema
The `rules` column supports the following keys:

- **`market_codes`** (Array of Strings): Includes all companies belonging to specific exchange codes.
  - Example: `{"market_codes": ["XNYS", "XNAS"]}`
- **`exclude_symbols`** (Array of Strings): Subtracts specific tickers from the list. This is primarily used to remove dual-listings from compact market baskets (e.g., removing Tesla's German listing `TL0.DE` from the "European Growth" basket).
  - Example: `{"exclude_symbols": ["TL0.DE"]}`
- **`include_symbols`** (Array of Strings): Forces the inclusion of specific tickers regardless of other rules.
  - Example: `{"include_symbols": ["AAPL"]}`

### Logical Flow
The final list of companies is calculated as:
`(Matches Market Codes) + (Included Symbols) - (Excluded Symbols)`

---

## 2. Manual Custom Baskets (Static)
Legacy or user-created custom baskets that do not have any `rules` defined will fall back to using the static `basket_companies` join table.
- Users can manually add or remove companies from these baskets through the standard association table.
- **Conversion**: If a custom basket is updated with `rules`, it will switch to the Smart logic automatically. If rules are cleared (`NULL`), it reverts to the static list.

---

## 3. API Endpoints

### List Baskets
`GET /api/baskets`
Returns all available baskets (global and those owned by the current user).

### List Companies in Basket
`GET /api/baskets/{basket_id}/companies`
Resolves and returns the actual list of companies currently in the basket.
**Response Fields**: `company_id`, `ticker`, `name`, `market_name`, `exchange_code`.

### Update Basket Rules (to be implemented)
`PUT /api/baskets/{basket_id}/rules`
Updates the JSON rules for a specific basket.
- **Payload**: `{"market_codes": [...], "exclude_symbols": [...], "include_symbols": [...]}`

---

## 4. Technical Implementation Details

### Helper Methods
The resolver handles three scenarios:
1.  **Rules-Based**: Query using `market_codes`, `include_symbols`, etc.
2.  **Legacy Market**: Query by `market_id`.
3.  **Static**: Join with `basket_companies`.

### Visibility & constraints
- **Hidden Baskets**: Baskets can be hidden from the frontend by setting `is_visible=False`. This is useful for "utility" baskets like "Delisted / OTC" that shouldn't be selected by users.
- **Uniqueness**: Basket names must be unique per owner (including System baskets where owner is NULL).
 
### Usage in Scans
All scanning endpoints (e.g., Golden Cross, Fibonacci-Elliott, Breakouts) use the dynamic resolver. 
> [!NOTE]
> If you exclude a stock from a basket via rules, it will automatically stop appearing in all technical scans for that basket.
