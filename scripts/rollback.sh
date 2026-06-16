#!/usr/bin/env bash
set -Eeuo pipefail

echo "Rollback requiere revision manual. Ejecuta migration:revert:prod solo si el cambio de base de datos es reversible."
