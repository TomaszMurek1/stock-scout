WITH CTE AS (
    SELECT 
        company_id,
        ROW_NUMBER() OVER (PARTITION BY ticker, market_id ORDER BY company_id) AS row_num
    FROM companies
)
DELETE FROM companies
WHERE company_id IN (
    SELECT company_id
    FROM CTE
    WHERE row_num > 1
);