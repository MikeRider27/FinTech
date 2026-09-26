from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import case, func, select

from app.deps import CurrentUser, DbSession
from app.models import Account, AccountStatus, EntryDirection, LedgerEntry, Transaction
from app.routers.transactions import user_transactions_query, with_accounts
from app.schemas import CurrencySummary, DashboardSummary, TransactionOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ZERO = Decimal("0.00")


@router.get("/summary", response_model=DashboardSummary)
def summary(user: CurrentUser, db: DbSession) -> DashboardSummary:
    open_accounts = (Account.owner_id == user.id) & (Account.status != AccountStatus.CLOSED)

    balances = db.execute(
        select(Account.currency, func.sum(Account.balance), func.count())
        .where(open_accounts)
        .group_by(Account.currency)
    ).all()

    since = datetime.now(timezone.utc) - timedelta(days=30)
    flows = {
        currency: (inflow or ZERO, outflow or ZERO)
        for currency, inflow, outflow in db.execute(
            select(
                Account.currency,
                func.sum(case((LedgerEntry.direction == EntryDirection.CREDIT, LedgerEntry.amount))),
                func.sum(case((LedgerEntry.direction == EntryDirection.DEBIT, LedgerEntry.amount))),
            )
            .join(Account, Account.id == LedgerEntry.account_id)
            .where(Account.owner_id == user.id, LedgerEntry.created_at >= since)
            .group_by(Account.currency)
        ).all()
    }

    recent = db.scalars(
        with_accounts(user_transactions_query(user.id)).order_by(Transaction.created_at.desc()).limit(5)
    )

    return DashboardSummary(
        accounts=sum(count for _, _, count in balances),
        by_currency=[
            CurrencySummary(
                currency=currency,
                balance=balance or ZERO,
                inflow_30d=flows.get(currency, (ZERO, ZERO))[0],
                outflow_30d=flows.get(currency, (ZERO, ZERO))[1],
            )
            for currency, balance, _ in sorted(balances)
        ],
        recent_transactions=[TransactionOut.model_validate(t) for t in recent],
    )
