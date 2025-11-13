"""add_portfolio_returns_and_nullable_company_id

Revision ID: add_portfolio_returns_and_nullable_company_id
Revises: ff7d90ada8e9
Create Date: 2025-11-11 11:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_portfolio_returns_and_nullable_company_id'
down_revision = 'ff7d90ada8e9'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Make company_id nullable in transactions table
    op.alter_column('transactions', 'company_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    
    # 2. Create portfolio_returns table
    op.create_table('portfolio_returns',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('portfolio_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('period', sa.String(length=10), nullable=False),
    sa.Column('ttwr', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('mwrr', sa.Numeric(precision=10, scale=6), nullable=True),
    sa.Column('unrealized_gains', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('realized_gains', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('dividend_income', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('interest_income', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('currency_effects', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('fees_paid', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('total_return', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('beginning_value', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('ending_value', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.Column('net_cash_flows', sa.Numeric(precision=18, scale=4), nullable=True),
    sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('portfolio_id', 'date', 'period', name='uq_portfolio_returns')
    )
    op.create_index('idx_portfolio_returns_date', 'portfolio_returns', ['portfolio_id', 'date'], unique=False)
    
    # 3. Drop the old instruments table and related columns (from your generated migration)
    op.drop_index('ix_instruments_figi', table_name='instruments')
    op.drop_index('ix_instruments_isin', table_name='instruments')
    op.drop_index('ix_instruments_symbol', table_name='instruments')
    op.drop_table('instruments')
    op.drop_index('ix_companies_instrument_type', table_name='companies')
    op.drop_column('companies', 'instrument_type')
    op.drop_index('ix_transactions_account_id', table_name='transactions')
    op.drop_constraint('fk_transactions_account_id_accounts', 'transactions', type_='foreignkey')
    op.create_foreign_key('fk_transactions_account_id', 'transactions', 'accounts', ['account_id'], ['id'])


def downgrade():
    # 1. Drop the portfolio_returns table
    op.drop_index('idx_portfolio_returns_date', table_name='portfolio_returns')
    op.drop_table('portfolio_returns')
    
    # 2. Revert company_id to not nullable
    op.alter_column('transactions', 'company_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    
    # 3. Revert the other changes (from your generated migration)
    op.drop_constraint('fk_transactions_account_id', 'transactions', type_='foreignkey')
    op.create_foreign_key('fk_transactions_account_id_accounts', 'transactions', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_transactions_account_id', 'transactions', ['account_id'], unique=False)
    op.add_column('companies', sa.Column('instrument_type', postgresql.ENUM('stock', 'etf', 'bond', 'crypto', 'commodity', 'cash', name='instrumenttype'), autoincrement=False, nullable=False))
    op.create_index('ix_companies_instrument_type', 'companies', ['instrument_type'], unique=False)
    op.create_table('instruments',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('symbol', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
    sa.Column('currency', sa.VARCHAR(length=3), autoincrement=False, nullable=False),
    sa.Column('market_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('isin', sa.VARCHAR(length=12), autoincrement=False, nullable=True),
    sa.Column('figi', sa.VARCHAR(length=12), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['market_id'], ['markets.market_id'], name='instruments_market_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='instruments_pkey'),
    sa.UniqueConstraint('symbol', 'market_id', name='uq_instrument_symbol_market')
    )
    op.create_index('ix_instruments_symbol', 'instruments', ['symbol'], unique=False)
    op.create_index('ix_instruments_isin', 'instruments', ['isin'], unique=False)
    op.create_index('ix_instruments_figi', 'instruments', ['figi'], unique=False)