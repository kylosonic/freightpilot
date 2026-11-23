#!/usr/bin/env bash
set -euo pipefail
umask 077

OUTPUT_FILE="${1:-backup.sql}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-supply_chain}"
TEMP_FILE="${OUTPUT_FILE}.partial.$$"
trap 'rm -f "${TEMP_FILE}"' EXIT

echo "Creating PostgreSQL backup to ${OUTPUT_FILE} ..."
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-privileges > "${TEMP_FILE}"
mv "${TEMP_FILE}" "${OUTPUT_FILE}"
trap - EXIT
echo "Backup completed: ${OUTPUT_FILE}"
