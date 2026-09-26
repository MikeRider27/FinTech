"""Lógica de movimientos de dinero.

Reglas:
- Toda operación corre en una sola transacción de base de datos.
- Las cuentas involucradas se bloquean con SELECT ... FOR UPDATE, siempre en el mismo
  orden (por id) para evitar deadlocks entre transferencias cruzadas.
- Cada cambio de saldo genera un LedgerEntry con el saldo resultante (auditoría).
- Un Idempotency-Key repetido devuelve la transacción original en lugar de duplicarla.
"""

import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Account,
    AccountStatus,
    EntryDirection,
    LedgerEntry,
    Transaction,
    TransactionType,
    User,
)


class LedgerError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code


def _new_reference() -> str:
    return f"TX{datetime.now(timezone.utc):%Y%m%d}{secrets.token_hex(6).upper()}"


def _find_idempotent(db: Session, user: User, key: str | None) -> Transaction | None:
    if not key:
        return None
    return db.scalar(
        select(Transaction).where(
            Transaction.initiated_by_id == user.id, Transaction.idempotency_key == key
        )
    )


def _lock_accounts(db: Session, *ids: uuid.UUID) -> dict[uuid.UUID, Account]:
    stmt = select(Account).where(Account.id.in_(ids)).order_by(Account.id).with_for_update()
    return {a.id: a for a in db.scalars(stmt)}


def _check_amount(amount: Decimal) -> Decimal:
    amount = amount.quantize(Decimal("0.01"))
    if amount <= 0:
        raise LedgerError("El monto debe ser mayor a cero")
    if amount > settings.max_transaction_amount:
        raise LedgerError(f"El monto excede el límite por operación ({settings.max_transaction_amount})")
    return amount


def _check_active(account: Account) -> None:
    if account.status != AccountStatus.ACTIVE:
        raise LedgerError(f"La cuenta {account.number} no está activa", 409)


def _post(db: Session, tx: Transaction, account: Account, direction: EntryDirection, amount: Decimal) -> None:
    if direction == EntryDirection.DEBIT:
        if account.balance < amount:
            raise LedgerError("Fondos insuficientes", 409)
        account.balance -= amount
    else:
        account.balance += amount
    db.add(
        LedgerEntry(
            transaction=tx,
            account_id=account.id,
            direction=direction,
            amount=amount,
            balance_after=account.balance,
        )
    )


def _commit(db: Session, tx: Transaction, user: User, key: str | None) -> Transaction:
    try:
        db.commit()
    except IntegrityError:
        # Dos peticiones concurrentes con el mismo Idempotency-Key: gana la primera
        db.rollback()
        existing = _find_idempotent(db, user, key)
        if existing:
            return existing
        raise
    db.refresh(tx)
    return tx


def _owned(accounts: dict[uuid.UUID, Account], account_id: uuid.UUID, user: User) -> Account:
    account = accounts.get(account_id)
    if account is None or account.owner_id != user.id:
        raise LedgerError("Cuenta no encontrada", 404)
    return account


def deposit(
    db: Session, user: User, account_id: uuid.UUID, amount: Decimal, description: str | None, key: str | None
) -> Transaction:
    if existing := _find_idempotent(db, user, key):
        return existing
    amount = _check_amount(amount)
    account = _owned(_lock_accounts(db, account_id), account_id, user)
    _check_active(account)

    tx = Transaction(
        reference=_new_reference(),
        type=TransactionType.DEPOSIT,
        amount=amount,
        currency=account.currency,
        description=description or "Depósito",
        destination_account_id=account.id,
        initiated_by_id=user.id,
        idempotency_key=key,
    )
    db.add(tx)
    _post(db, tx, account, EntryDirection.CREDIT, amount)
    return _commit(db, tx, user, key)


def withdraw(
    db: Session, user: User, account_id: uuid.UUID, amount: Decimal, description: str | None, key: str | None
) -> Transaction:
    if existing := _find_idempotent(db, user, key):
        return existing
    amount = _check_amount(amount)
    account = _owned(_lock_accounts(db, account_id), account_id, user)
    _check_active(account)

    tx = Transaction(
        reference=_new_reference(),
        type=TransactionType.WITHDRAWAL,
        amount=amount,
        currency=account.currency,
        description=description or "Retiro",
        source_account_id=account.id,
        initiated_by_id=user.id,
        idempotency_key=key,
    )
    db.add(tx)
    _post(db, tx, account, EntryDirection.DEBIT, amount)
    return _commit(db, tx, user, key)


def transfer(
    db: Session,
    user: User,
    source_account_id: uuid.UUID,
    destination_number: str,
    amount: Decimal,
    description: str | None,
    key: str | None,
) -> Transaction:
    if existing := _find_idempotent(db, user, key):
        return existing
    amount = _check_amount(amount)

    destination_id = db.scalar(select(Account.id).where(Account.number == destination_number.strip()))
    if destination_id is None:
        raise LedgerError("La cuenta destino no existe", 404)
    if destination_id == source_account_id:
        raise LedgerError("La cuenta origen y destino no pueden ser la misma")

    accounts = _lock_accounts(db, source_account_id, destination_id)
    source = _owned(accounts, source_account_id, user)
    destination = accounts[destination_id]
    _check_active(source)
    _check_active(destination)
    if source.currency != destination.currency:
        raise LedgerError(
            f"Las cuentas deben tener la misma moneda ({source.currency} ≠ {destination.currency})"
        )

    tx = Transaction(
        reference=_new_reference(),
        type=TransactionType.TRANSFER,
        amount=amount,
        currency=source.currency,
        description=description or "Transferencia",
        source_account_id=source.id,
        destination_account_id=destination.id,
        initiated_by_id=user.id,
        idempotency_key=key,
    )
    db.add(tx)
    _post(db, tx, source, EntryDirection.DEBIT, amount)
    _post(db, tx, destination, EntryDirection.CREDIT, amount)
    return _commit(db, tx, user, key)
