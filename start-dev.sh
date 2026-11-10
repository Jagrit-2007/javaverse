#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# JavaVerse Local Development Startup Script (Part 13)
# ==============================================================================
#
# WHAT THIS SCRIPT DOES:
# 1. Checks that Docker and pnpm prerequisites are installed and accessible.
# 2. Starts the background Docker Compose services (PostgreSQL, Redis Cache,
#    Redis Queue, Mailpit, MinIO) in detached mode without resetting volumes.
# 3. Displays the status of the local infrastructure containers.
# 4. Launches the Next.js development server (apps/web) and TypeScript background
#    worker (apps/worker) concurrently via `pnpm dev`.
#
# PERSISTENCE & LIFECYCLE CONTRACT:
# - PostgreSQL user records, sessions, and progress data are stored durably in the
#   named Docker volume `javaverse_postgres_data`.
# - Stopping this script with Ctrl+C terminates the Node.js processes (web & worker).
# - It does NOT stop or destroy Docker containers or delete database volumes.
# - Rerunning `./start-dev.sh` preserves all created accounts, passwords, and progress.
#
# DOCKER CLEANUP INSTRUCTIONS:
# - To safely stop the background containers without losing local data:
#     docker compose -f infra/docker-compose.yml down
# - WARNING: NEVER run `docker compose down -v` or `prisma migrate reset` casually.
#   The `-v` flag permanently deletes the Docker volume, wiping all local accounts.
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Verify required prerequisites
if ! command -v docker &> /dev/null; then
  echo "Error: 'docker' command is not available in PATH. Please install Docker." >&2
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "Error: 'pnpm' command is not available in PATH. Please install pnpm." >&2
  exit 1
fi

echo "================================================================================"
echo " Starting JavaVerse Local Development Environment"
echo "================================================================================"
echo "1. Starting infrastructure containers (PostgreSQL, Redis, Mailpit, MinIO)..."
docker compose -f infra/docker-compose.yml up -d

echo
echo "2. Infrastructure status:"
docker compose -f infra/docker-compose.yml ps

echo
echo "================================================================================"
echo " 3. Starting development servers (Next.js web + TypeScript worker)..."
echo " - Web:    http://localhost:3000"
echo " - Mail:   http://localhost:8025"
echo " - MinIO:  http://localhost:9001"
echo
echo " Press Ctrl+C at any time to stop web and worker processes."
echo " Note: Local account data is safely persisted in Docker volume."
echo "================================================================================"
echo

pnpm dev
