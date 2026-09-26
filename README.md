# FinTech

Plataforma de banca digital: cuentas multimoneda, depósitos, retiros, transferencias entre usuarios y estado de cuenta auditable.

| Capa       | Tecnología                                           |
|------------|------------------------------------------------------|
| Frontend   | React 18 + Vite + React Router, servido por Nginx    |
| Backend    | Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic       |
| Base datos | PostgreSQL 16                                        |
| Infra      | Docker Compose                                       |

## Inicio rápido

```bash
cp .env.example .env        # opcional: todo tiene valores por defecto
docker compose up -d --build
```

| Servicio              | URL                                  |
|-----------------------|--------------------------------------|
| Aplicación web        | http://localhost:3500                |
| API (Swagger)         | http://localhost:8000/api/docs       |
| PostgreSQL (local)    | `localhost:5433` (usuario/clave en `.env`) |

Las migraciones se aplican solas al iniciar el backend. Para detener: `docker compose down` (agrega `-v` para borrar también los datos).

## Arquitectura

```
Navegador ──► frontend (Nginx :80)
                 ├── /        → SPA de React
                 └── /api/*   → backend (FastAPI :8000) ──► db (PostgreSQL :5432)
```

El navegador solo habla con el frontend; Nginx reenvía `/api` al backend, así que no hay IPs ni URLs de backend en el código del cliente. La base de datos está en una red interna a la que el frontend no tiene acceso.

```
Backend/
  app/
    core/        configuración (variables de entorno) y seguridad (JWT, bcrypt)
    routers/     auth, accounts, transactions, dashboard
    services/    ledger.py: toda la lógica de movimiento de dinero
    models.py    User, Account, Transaction, LedgerEntry
    schemas.py   validación de entrada/salida (Pydantic)
  alembic/       migraciones
Frontend/
  src/
    pages/       Login, Register, Dashboard, Accounts, AccountDetail, Operations, Transactions
    components/  Layout y componentes de UI
    api.js       cliente HTTP
    auth.jsx     contexto de sesión
```

## Garantías del núcleo financiero

- **Precisión:** los montos se guardan como `NUMERIC(18,2)` y viajan como string en JSON; nunca se usan floats.
- **Atomicidad:** cada operación es una única transacción de base de datos; o se aplica completa o no se aplica.
- **Concurrencia:** las cuentas se bloquean con `SELECT … FOR UPDATE` siempre en el mismo orden, lo que evita sobregiros y deadlocks cuando hay transferencias simultáneas. Además, un `CHECK (balance >= 0)` en la base de datos actúa como última defensa.
- **Auditoría:** cada cambio de saldo genera un `LedgerEntry` inmutable (débito/crédito, monto y saldo resultante) con una secuencia de asiento monotónica.
- **Idempotencia:** el header `Idempotency-Key` hace que reintentar una operación (doble clic, error de red) devuelva la transacción original en lugar de duplicarla. El frontend genera una clave por intento.

## API

Todas las rutas (salvo registro, login y health) requieren `Authorization: Bearer <token>`.

| Método | Ruta                                  | Descripción                          |
|--------|---------------------------------------|--------------------------------------|
| POST   | `/api/auth/register`                  | Crear usuario (devuelve token)       |
| POST   | `/api/auth/login`                     | Iniciar sesión                       |
| GET    | `/api/auth/me`                        | Usuario actual                       |
| GET    | `/api/accounts`                       | Listar cuentas                       |
| POST   | `/api/accounts`                       | Abrir cuenta `{alias, currency}`     |
| GET    | `/api/accounts/currencies`            | Monedas soportadas                   |
| GET    | `/api/accounts/{id}`                  | Detalle de cuenta                    |
| PATCH  | `/api/accounts/{id}`                  | Cambiar alias o estado (`ACTIVE`/`FROZEN`/`CLOSED`) |
| GET    | `/api/accounts/{id}/statement`        | Estado de cuenta paginado            |
| POST   | `/api/transactions/deposit`           | Depósito                             |
| POST   | `/api/transactions/withdraw`          | Retiro                               |
| POST   | `/api/transactions/transfer`          | Transferencia a un número de cuenta  |
| GET    | `/api/transactions`                   | Historial (`account_id`, `type`, `limit`, `offset`) |
| GET    | `/api/dashboard/summary`              | Resumen por moneda y últimos movimientos |
| GET    | `/api/health`                         | Estado del servicio y la BD          |

Reglas: las transferencias exigen la misma moneda en ambas cuentas; las cuentas congeladas o cerradas no pueden operar; solo se cierra una cuenta con saldo cero.

## Desarrollo sin Docker

```bash
# Backend (con PostgreSQL de docker compose corriendo en :5433)
cd Backend
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://fintech:fintech@localhost:5433/fintech
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (proxy /api → localhost:8000)
cd Frontend
npm install
npm run dev     # http://localhost:5173
```

Nueva migración tras cambiar `models.py`: `alembic revision --autogenerate -m "descripcion"`.

## Antes de producción

- Define un `SECRET_KEY` fuerte y `ENVIRONMENT=production` (el backend se niega a arrancar con la clave por defecto).
- Sirve todo detrás de HTTPS y quita la publicación de los puertos `8000` y `5433` en `docker-compose.yml`.
- Pendientes recomendados: rate limiting en el login, refresh tokens o cookies `httpOnly` en lugar de `localStorage`, 2FA, KYC y límites diarios por usuario, y los depósitos/retiros conectados a una pasarela real (hoy se registran directamente).
