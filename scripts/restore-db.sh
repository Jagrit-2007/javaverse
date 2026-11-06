#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# JavaVerse PostgreSQL Hardened Restore Script
# Restores a compressed or plain SQL dump into a verified target database.
# ==============================================================================

YES=false
DRY_RUN=false
TARGET_DB=""
TARGET_DB_FLAG_VALUE=""
EXPLICIT_TARGET_DB_FLAG=false
BACKUP_FILE=""
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)
      YES=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --target-db)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --target-db requires an argument" >&2
        exit 1
      fi
      TARGET_DB_FLAG_VALUE="$2"
      EXPLICIT_TARGET_DB_FLAG=true
      shift 2
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
  BACKUP_FILE="${POSITIONAL_ARGS[0]}"
fi

if [[ -n "${TARGET_DB_FLAG_VALUE}" ]]; then
  TARGET_DB="${TARGET_DB_FLAG_VALUE}"
elif [[ ${#POSITIONAL_ARGS[@]} -ge 2 ]]; then
  TARGET_DB="${POSITIONAL_ARGS[1]}"
else
  TARGET_DB="${POSTGRES_DB:-javaverse}"
fi

# Verify positional target_database matches --target-db if both are provided
if [[ ${#POSITIONAL_ARGS[@]} -ge 2 && -n "${TARGET_DB_FLAG_VALUE}" ]]; then
  if [[ "${POSITIONAL_ARGS[1]}" != "${TARGET_DB_FLAG_VALUE}" ]]; then
    echo "Error: Positional target database '${POSITIONAL_ARGS[1]}' does not match --target-db '${TARGET_DB_FLAG_VALUE}'." >&2
    exit 1
  fi
fi

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 [options] <backup-file.sql[.gz]> [target_database]" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --yes, -y                       Acknowledge destructive restore in non-interactive mode" >&2
  echo "  --target-db <name>              Explicitly specify and verify the destination database" >&2
  echo "  --dry-run                       Validate checksums and environment without restoring" >&2
  exit 1
fi

TARGET_CONTAINER="${POSTGRES_CONTAINER:-javaverse-postgres}"
TARGET_USER="${POSTGRES_USER:-javaverse}"
TARGET_PORT="${POSTGRES_PORT:-5432}"
TARGET_HOST="${POSTGRES_HOST:-localhost}"

# 1. Validate target database name format (reject empty, malformed, or injection)
if [[ ! "${TARGET_DB}" =~ ^[a-zA-Z0-9_]{1,63}$ ]]; then
  echo "Error: Target database name '${TARGET_DB}' is invalid. Must be 1-63 alphanumeric/underscore characters." >&2
  exit 1
fi

# 2. Reject protected, system, or production database names
PROTECTED_DBS=(
  "postgres"
  "template0"
  "template1"
  "master"
  "model"
  "msdb"
  "tempdb"
  "rdsadmin"
  "prod"
  "production"
  "javaverse_prod"
  "javaverse_production"
  "javaverse-production"
)

for protected in "${PROTECTED_DBS[@]}"; do
  if [[ "${TARGET_DB,,}" == "${protected,,}" ]]; then
    echo "Error: Target database '${TARGET_DB}' is a protected system or production database. Restore rejected." >&2
    exit 1
  fi
done

# 3. Check backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

# 4. Mandatory checksum verification
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ ! -f "${CHECKSUM_FILE}" ]; then
  echo "Error: Mandatory checksum file '${CHECKSUM_FILE}' is missing. Restore rejected." >&2
  exit 1
fi

# Display target information without credentials
echo "=== JavaVerse Hardened Database Restore ==="
echo "Container:   ${TARGET_CONTAINER}"
echo "Host:        ${TARGET_HOST}"
echo "Port:        ${TARGET_PORT}"
echo "Database:    ${TARGET_DB}"
echo "User:        ${TARGET_USER}"
echo "Source File: ${BACKUP_FILE}"
echo "Mode:        $([ "${DRY_RUN}" = true ] && echo "DRY RUN (no changes)" || echo "ACTIVE RESTORE")"

# 5. Verify checksum integrity
echo "Verifying SHA-256 integrity..."
BACKUP_DIR="$(dirname "${BACKUP_FILE}")"
CHECKSUM_BASENAME="$(basename "${CHECKSUM_FILE}")"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "${BACKUP_DIR}" && sha256sum -c "${CHECKSUM_BASENAME}") || {
    echo "Error: Checksum verification failed for '${BACKUP_FILE}'." >&2
    exit 1
  }
elif command -v shasum >/dev/null 2>&1; then
  (cd "${BACKUP_DIR}" && shasum -a 256 -c "${CHECKSUM_BASENAME}") || {
    echo "Error: Checksum verification failed for '${BACKUP_FILE}'." >&2
    exit 1
  }
else
  echo "Error: Neither sha256sum nor shasum is available for checksum verification." >&2
  exit 1
fi
echo "Checksum verified successfully."

# 6. Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
  echo "Error: Target container '${TARGET_CONTAINER}' is not running." >&2
  exit 1
fi

# 7. Dry run exit
if [ "${DRY_RUN}" = true ]; then
  echo "Dry run completed successfully. Verification passed. No changes were made to '${TARGET_DB}'."
  echo "==========================================="
  exit 0
fi

# 8. Interactive vs Non-interactive confirmation
if [ "${YES}" = true ]; then
  if [ "${EXPLICIT_TARGET_DB_FLAG}" != true ]; then
    echo "Error: Non-interactive restore requires explicit '--target-db <expected-database-name>'. Restore rejected." >&2
    exit 1
  fi
  if [ "${TARGET_DB_FLAG_VALUE}" != "${TARGET_DB}" ]; then
    echo "Error: Non-interactive target-db mismatch: '${TARGET_DB_FLAG_VALUE}' != '${TARGET_DB}'. Restore rejected." >&2
    exit 1
  fi
elif [ -t 0 ]; then
  echo ""
  echo "WARNING: This will DESTROY and overwrite existing data in '${TARGET_DB}'!"
  read -r -p "Type the exact database name '${TARGET_DB}' to confirm restore: " CONFIRM_NAME
  if [ "${CONFIRM_NAME}" != "${TARGET_DB}" ]; then
    echo "Error: Confirmation input '${CONFIRM_NAME}' did not match '${TARGET_DB}'. Restore aborted." >&2
    exit 1
  fi
else
  echo "Error: Non-interactive restore requires explicit '--yes' and '--target-db ${TARGET_DB}'. Restore rejected." >&2
  exit 1
fi

# 9. Secure temporary directory and file with trap cleanup
TMP_DIR="$(mktemp -d)"
chmod 700 "${TMP_DIR}"
TMP_SQL="${TMP_DIR}/restore.sql"
touch "${TMP_SQL}"
chmod 600 "${TMP_SQL}"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT INT TERM HUP

# 10. Decompress or copy backup into secured temporary file
echo "Preparing SQL payload..."
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gzip -dc "${BACKUP_FILE}" > "${TMP_SQL}"
else
  cp "${BACKUP_FILE}" "${TMP_SQL}"
fi

# Ensure required extensions exist in target database
docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" \
  -c "CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 || true

# Execute restore from secured file
echo "Restoring data into '${TARGET_DB}'..."
docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" < "${TMP_SQL}" >/dev/null

echo "Restore completed successfully into '${TARGET_DB}'!"
echo "==========================================="
