import secrets
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.deps import CurrentUser, DbSession
from app.models import Account, AccountStatus, LedgerEntry, User
from app.schemas import AccountCreate, AccountOut, AccountUpdate, LedgerEntryOut, Page

router = APIRouter(prefix="/accounts", tags=["accounts"])


def get_owned_account(db: Session, user: User, account_id: uuid.UUID) -> Account:
    account = db.get(Account, account_id)
    if account is None or account.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cuenta no encontrada")
    return account


def _generate_number(db: Session) -> str:
    while True:
        number = "10" + "".join(str(secrets.randbelow(10)) for _ in range(14))
        if not db.scalar(select(Account.id).where(Account.number == number)):
            return number


@router.get("/currencies", response_model=list[str])
def currencies() -> list[str]:
    return settings.currency_list


@router.get("", response_model=list[AccountOut])
def list_accounts(user: CurrentUser, db: DbSession) -> list[Account]:
    return list(db.scalars(select(Account).where(Account.owner_id == user.id).order_by(Account.created_at)))


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, user: CurrentUser, db: DbSession) -> Account:
    account = Account(owner_id=user.id, alias=data.alias.strip(), currency=data.currency, number=_generate_number(db))
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Account:
    return get_owned_account(db, user, account_id)


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(account_id: uuid.UUID, data: AccountUpdate, user: CurrentUser, db: DbSession) -> Account:
    account = get_owned_account(db, user, account_id)
    if account.status == AccountStatus.CLOSED:
        raise HTTPException(status.HTTP_409_CONFLICT, "La cuenta está cerrada")
    if data.alias is not None:
        account.alias = data.alias.strip()
    if data.status is not None:
        if data.status == AccountStatus.CLOSED and account.balance != 0:
            raise HTTPException(status.HTTP_409_CONFLICT, "Solo se puede cerrar una cuenta con saldo cero")
        account.status = data.status
    db.commit()
    db.refresh(account)
    return account


@router.get("/{account_id}/statement", response_model=Page[LedgerEntryOut])
def statement(
    account_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Page[LedgerEntryOut]:
    account = get_owned_account(db, user, account_id)
    base = select(LedgerEntry).where(LedgerEntry.account_id == account.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    entries = db.scalars(
        base.options(joinedload(LedgerEntry.transaction))
        .order_by(LedgerEntry.seq.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [
        LedgerEntryOut(
            id=e.id,
            transaction_id=e.transaction_id,
            direction=e.direction,
            amount=e.amount,
            balance_after=e.balance_after,
            created_at=e.created_at,
            reference=e.transaction.reference,
            type=e.transaction.type,
            description=e.transaction.description,
        )
        for e in entries
    ]
    return Page[LedgerEntryOut](items=items, total=total, limit=limit, offset=offset)
