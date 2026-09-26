import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Header, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.deps import CurrentUser, DbSession
from app.models import Account, Transaction, TransactionType
from app.routers.accounts import get_owned_account
from app.schemas import DepositRequest, Page, TransactionOut, TransferRequest, WithdrawalRequest
from app.services import ledger

router = APIRouter(prefix="/transactions", tags=["transactions"])

IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key", max_length=64)]


def _run(db: Session, fn: Callable[..., Transaction], *args) -> Transaction:
    try:
        return fn(db, *args)
    except Exception:
        db.rollback()
        raise


def user_transactions_query(user_id: uuid.UUID):
    owned = select(Account.id).where(Account.owner_id == user_id)
    return select(Transaction).where(
        or_(Transaction.source_account_id.in_(owned), Transaction.destination_account_id.in_(owned))
    )


def with_accounts(stmt):
    return stmt.options(joinedload(Transaction.source_account), joinedload(Transaction.destination_account))


@router.post("/deposit", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def deposit(data: DepositRequest, user: CurrentUser, db: DbSession, key: IdempotencyKey = None) -> Transaction:
    return _run(db, ledger.deposit, user, data.account_id, data.amount, data.description, key)


@router.post("/withdraw", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def withdraw(data: WithdrawalRequest, user: CurrentUser, db: DbSession, key: IdempotencyKey = None) -> Transaction:
    return _run(db, ledger.withdraw, user, data.account_id, data.amount, data.description, key)


@router.post("/transfer", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def transfer(data: TransferRequest, user: CurrentUser, db: DbSession, key: IdempotencyKey = None) -> Transaction:
    return _run(
        db,
        ledger.transfer,
        user,
        data.source_account_id,
        data.destination_account_number,
        data.amount,
        data.description,
        key,
    )


@router.get("", response_model=Page[TransactionOut])
def list_transactions(
    user: CurrentUser,
    db: DbSession,
    account_id: uuid.UUID | None = None,
    type: TransactionType | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Page[TransactionOut]:
    stmt = user_transactions_query(user.id)
    if account_id is not None:
        get_owned_account(db, user, account_id)
        stmt = stmt.where(
            or_(Transaction.source_account_id == account_id, Transaction.destination_account_id == account_id)
        )
    if type is not None:
        stmt = stmt.where(Transaction.type == type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        with_accounts(stmt).order_by(Transaction.created_at.desc(), Transaction.id).limit(limit).offset(offset)
    )
    items = [TransactionOut.model_validate(t) for t in rows]
    return Page[TransactionOut](items=items, total=total, limit=limit, offset=offset)
