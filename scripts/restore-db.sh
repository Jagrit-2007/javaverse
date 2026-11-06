#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# JavaVerse PostgreSQL Restore Script
# Restores a compressed or plain SQL dump into the target database.
# ==============================================================================

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-file.sql[.gz]> [target_database]" >&2
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-${POSTGRES_DB:-javaverse}}"
TARGET_CONTAINER="${POSTGRES_CONTAINER:-javaverse-postgres}"
TARGET_USER="${POSTGRES_USER:-javaverse}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

echo "=== Starting JavaVerse Database Restore ==="
echo "Container:   ${TARGET_CONTAINER}"
echo "Database:    ${TARGET_DB}"
echo "User:        ${TARGET_USER}"
echo "Source File: ${BACKUP_FILE}"

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
  echo "Error: Target container '${TARGET_CONTAINER}' is not running." >&2
  exit 1
fi

# Verify checksum if present
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "Verifying SHA-256 integrity..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${CHECKSUM_FILE}"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${CHECKSUM_FILE}"
  fi
  echo "Checksum verified."
fi

# Ensure extensions are present in target database
docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" \
  -c "CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 || true

# Restore based on compression
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gzip -dc "${BACKUP_FILE}" | docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" >/dev/null
else
  cat "${BACKUP_FILE}" | docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" >/dev/null
fi

echo "Restore completed successfully into '${TARGET_DB}'!"
echo "==========================================="

