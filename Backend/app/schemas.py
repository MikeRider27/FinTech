import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import settings
from app.models import AccountStatus, EntryDirection, TransactionStatus, TransactionType

# Los montos viajan como string en JSON para no perder precisión (nunca float)
Amount = Annotated[Decimal, Field(gt=0, max_digits=18, decimal_places=2)]
T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError("La contraseña debe contener letras y números")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


# ---------- Cuentas ----------
class AccountCreate(BaseModel):
    alias: str = Field(min_length=1, max_length=80)
    currency: str = Field(min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def supported_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in settings.currency_list:
            raise ValueError(f"Moneda no soportada. Opciones: {', '.join(settings.currency_list)}")
        return v


class AccountUpdate(BaseModel):
    alias: str | None = Field(default=None, min_length=1, max_length=80)
    status: AccountStatus | None = None


class AccountOut(ORMModel):
    id: uuid.UUID
    number: str
    alias: str
    currency: str
    balance: Decimal
    status: AccountStatus
    created_at: datetime


class LedgerEntryOut(ORMModel):
    id: uuid.UUID
    transaction_id: uuid.UUID
    direction: EntryDirection
    amount: Decimal
    balance_after: Decimal
    created_at: datetime
    reference: str
    type: TransactionType
    description: str | None


# ---------- Transacciones ----------
class DepositRequest(BaseModel):
    account_id: uuid.UUID
    amount: Amount
    description: str | None = Field(default=None, max_length=255)


class WithdrawalRequest(DepositRequest):
    pass


class TransferRequest(BaseModel):
    source_account_id: uuid.UUID
    destination_account_number: str = Field(min_length=6, max_length=20)
    amount: Amount
    description: str | None = Field(default=None, max_length=255)


class TransactionOut(ORMModel):
    id: uuid.UUID
    reference: str
    type: TransactionType
    status: TransactionStatus
    amount: Decimal
    currency: str
    description: str | None
    source_account_id: uuid.UUID | None
    destination_account_id: uuid.UUID | None
    source_account_number: str | None
    destination_account_number: str | None
    created_at: datetime


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


# ---------- Dashboard ----------
class CurrencySummary(BaseModel):
    currency: str
    balance: Decimal
    inflow_30d: Decimal
    outflow_30d: Decimal


class DashboardSummary(BaseModel):
    accounts: int
    by_currency: list[CurrencySummary]
    recent_transactions: list[TransactionOut]
