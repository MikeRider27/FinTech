"""Esquema inicial: usuarios, cuentas, transacciones y libro contable

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-25
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)
MONEY = sa.Numeric(18, 2)
NOW = sa.text("now()")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "accounts",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("number", sa.String(20), nullable=False),
        sa.Column("owner_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("alias", sa.String(80), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("balance", MONEY, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("balance >= 0", name="ck_accounts_balance_non_negative"),
    )
    op.create_index("ix_accounts_number", "accounts", ["number"], unique=True)
    op.create_index("ix_accounts_owner_id", "accounts", ["owner_id"])

    op.create_table(
        "transactions",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("reference", sa.String(32), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("amount", MONEY, nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("description", sa.String(255)),
        sa.Column("source_account_id", UUID, sa.ForeignKey("accounts.id")),
        sa.Column("destination_account_id", UUID, sa.ForeignKey("accounts.id")),
        sa.Column("initiated_by_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.UniqueConstraint("initiated_by_id", "idempotency_key", name="uq_transactions_idempotency"),
        sa.CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
    )
    op.create_index("ix_transactions_reference", "transactions", ["reference"], unique=True)
    op.create_index("ix_transactions_source_account_id", "transactions", ["source_account_id"])
    op.create_index("ix_transactions_destination_account_id", "transactions", ["destination_account_id"])
    op.create_index("ix_transactions_initiated_by_id", "transactions", ["initiated_by_id"])
    op.create_index("ix_transactions_created_at", "transactions", ["created_at"])

    op.create_table(
        "ledger_entries",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("seq", sa.BigInteger(), sa.Identity(always=True), nullable=False, unique=True),
        sa.Column("transaction_id", UUID, sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("account_id", UUID, sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("amount", MONEY, nullable=False),
        sa.Column("balance_after", MONEY, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_ledger_entries_amount_positive"),
    )
    op.create_index("ix_ledger_entries_transaction_id", "ledger_entries", ["transaction_id"])
    op.create_index("ix_ledger_entries_account_id", "ledger_entries", ["account_id"])
    op.create_index("ix_ledger_entries_account_seq", "ledger_entries", ["account_id", "seq"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])


def downgrade() -> None:
    op.drop_table("ledger_entries")
    op.drop_table("transactions")
    op.drop_table("accounts")
    op.drop_table("users")
