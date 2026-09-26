#!/bin/sh
set -e

echo "Aplicando migraciones..."
alembic upgrade head

exec "$@"
