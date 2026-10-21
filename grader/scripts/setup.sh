#!/usr/bin/env bash
# Creates .env for docker-compose.yml. Run once on the server.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -e .env ]]; then
  echo ".env already exists; delete it first to regenerate." >&2
  exit 1
fi

read -rp "Domain (e.g. grader.example.com, or :80 for plain HTTP by IP): " DOMAIN
read -rp "Admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
read -rsp "Admin password: " ADMIN_PASSWORD; echo
read -rp "Class code students need to register (empty = open registration): " REGISTRATION_CODE

COOKIE_SECURE=true
[[ "$DOMAIN" == :* ]] && COOKIE_SECURE=false

umask 077
cat > .env <<ENV
DOMAIN=$DOMAIN
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
REGISTRATION_CODE=$REGISTRATION_CODE
REGISTRATION_OPEN=true
COOKIE_SECURE=$COOKIE_SECURE
WORKER_CONCURRENCY=1
TZ=Asia/Bangkok
ENV

echo "Wrote .env. Next: docker compose up -d --build"
