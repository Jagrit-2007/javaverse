#!/usr/bin/env bash
set -euo pipefail

# Enforce strict umask 077 so all created files and directories are owner-only
umask 077

# ==============================================================================
# JavaVerse PostgreSQL Backup Script
# Creates a compressed, timestamped, checksummed SQL dump of the database.
# Enforces restrictive owner-only permissions (0600) independent of shell umask.
# ==============================================================================

TARGET_CONTAINER="${POSTGRES_CONTAINER:-javaverse-postgres}"
TARGET_DB="${POSTGRES_DB:-javaverse}"
TARGET_USER="${POSTGRES_USER:-javaverse}"
BACKUP_DIR="${1:-./backups}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${BACKUP_DIR}/javaverse_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${OUTPUT_FILE}.sha256"

echo "=== Starting JavaVerse Database Backup ==="
echo "Container:   ${TARGET_CONTAINER}"
echo "Database:    ${TARGET_DB}"
echo "User:        ${TARGET_USER}"
echo "Destination: ${OUTPUT_FILE}"

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
  echo "Error: Target container '${TARGET_CONTAINER}' is not running." >&2
  exit 1
fi

# Run pg_dump through gzip
docker exec -i "${TARGET_CONTAINER}" pg_dump \
  -U "${TARGET_USER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip -c > "${OUTPUT_FILE}"

chmod 600 "${OUTPUT_FILE}"

# Generate SHA-256 checksum
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_FILE}" > "${CHECKSUM_FILE}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${OUTPUT_FILE}" > "${CHECKSUM_FILE}"
fi

chmod 600 "${CHECKSUM_FILE}"

# Verify final backup and checksum permissions
check_perms() {
  local target="$1"
  if [ -e "${target}" ]; then
    local perms
    perms=$(ls -l "${target}" | awk '{print $1}')
    case "${perms}" in
      -rw-------*) ;;
      -r--------*) ;;
      *)
        echo "Error: Insecure permissions detected on ${target}: ${perms}. Expected 0600 (-rw-------)." >&2
        exit 1
        ;;
    esac
  fi
}

check_perms "${OUTPUT_FILE}"
check_perms "${CHECKSUM_FILE}"

FILE_SIZE=$(ls -lh "${OUTPUT_FILE}" | awk '{print $5}')
echo "Backup completed successfully!"
echo "Size:     ${FILE_SIZE}"
echo "File:     ${OUTPUT_FILE}"
echo "Permissions: 0600 (owner-only verified)"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "Checksum: $(cat "${CHECKSUM_FILE}")"
fi
echo "=========================================="

