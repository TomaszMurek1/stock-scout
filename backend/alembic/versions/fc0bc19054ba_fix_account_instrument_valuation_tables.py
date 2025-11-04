"""fix account, instrument, valuation tables"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "fc0bc19054ba"
down_revision = "53c2e5c671bf"
branch_labels = None
depends_on = None


def upgrade():
    # --- 1. Create accounts table -------------------------------------------
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("portfolios.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("account_type", sa.String(length=30), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_accounts_portfolio_id", "accounts", ["portfolio_id"])

    # --- 2. Create instrumenttype enum + instruments table ------------------
    instrument_type = sa.Enum(name="instrumenttype")

    op.create_table(
        "instruments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", instrument_type, nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("market_id", sa.Integer(), sa.ForeignKey("markets.market_id"), nullable=True),
        sa.Column("isin", sa.String(length=12), nullable=True),
        sa.Column("figi", sa.String(length=12), nullable=True),
    )

    op.create_index("ix_instruments_type", "instruments", ["type"])
    op.create_index("ix_instruments_symbol", "instruments", ["symbol"])
    op.create_index("ix_instruments_isin", "instruments", ["isin"])
    op.create_index("ix_instruments_figi", "instruments", ["figi"])
    op.create_unique_constraint("uq_instrument_symbol_market", "instruments", ["symbol", "market_id"])

    # --- 3. Create portfolio_valuation_daily table --------------------------
    op.create_table(
        "portfolio_valuation_daily",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("portfolios.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("total_value", sa.Numeric(20, 4), nullable=False),

        sa.Column("by_stock", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("by_etf", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("by_bond", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("by_crypto", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("by_commodity", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("by_cash", sa.Numeric(20, 4), nullable=False, server_default="0"),

        sa.Column("net_contributions", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_unique_constraint("uq_pv_portfolio_date", "portfolio_valuation_daily", ["portfolio_id", "date"])
    op.create_index("idx_pv_portfolio_date", "portfolio_valuation_daily", ["portfolio_id", "date"])

    # --- 4. Drop cash_balances table (if it still exists) -------------------
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "cash_balances" in inspector.get_table_names():
        op.drop_table("cash_balances")

    # --- 5. Add enum values to TxType (if not yet added) --------------------
    # Replace 'txtype' with your actual DB enum name if different
    #op.execute("ALTER TYPE txtype ADD VALUE IF NOT EXISTS 'transfer_in'")
    #op.execute("ALTER TYPE txtype ADD VALUE IF NOT EXISTS 'transfer_out'")


def downgrade():
    # Drop new tables in reverse order
    op.drop_index("idx_pv_portfolio_date", table_name="portfolio_valuation_daily")
    op.drop_constraint("uq_pv_portfolio_date", "portfolio_valuation_daily", type_="unique")
    op.drop_table("portfolio_valuation_daily")

    op.drop_constraint("uq_instrument_symbol_market", "instruments", type_="unique")
    op.drop_index("ix_instruments_figi", table_name="instruments")
    op.drop_index("ix_instruments_isin", table_name="instruments")
    op.drop_index("ix_instruments_symbol", table_name="instruments")
    op.drop_index("ix_instruments_type", table_name="instruments")
    op.drop_table("instruments")

    instrument_type = sa.Enum(name="instrumenttype")
    instrument_type.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_accounts_portfolio_id", table_name="accounts")
    op.drop_table("accounts")

    # (We won't remove enum values from txtype; Postgres doesn't support that safely)
