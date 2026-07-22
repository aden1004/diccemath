#!/usr/bin/env bash
# Push environment variables from .env.local to Vercel (production)
# Run from: diccemath/diccemath/

set -e

ENV_FILE=".env.local"
ENV_NAMES=(
  "GOOGLE_SHEET_ID"
  "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  "GOOGLE_PRIVATE_KEY"
  "SESSION_SECRET"
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
)

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Read each var and push to Vercel
for name in "${ENV_NAMES[@]}"; do
  # Extract value (everything after '=' on the line starting with NAME=)
  value=$(grep "^${name}=" "$ENV_FILE" | head -1 | cut -d'=' -f2-)
  # Strip surrounding double quotes if any
  value="${value#\"}"
  value="${value%\"}"

  if [ -z "$value" ]; then
    echo "SKIP $name (empty)"
    continue
  fi

  # Remove first if exists (ignore failure if not exists)
  npx vercel env rm "$name" production --yes --scope aden1004s-projects > /dev/null 2>&1 || true

  # Add new value via stdin
  printf '%s' "$value" | npx vercel env add "$name" production --scope aden1004s-projects
  echo "✓ $name"
done

echo ""
echo "All env vars pushed to Vercel (production)"
