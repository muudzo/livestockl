#!/usr/bin/env bash
#
# Finishes the two remaining whatsapp-cloud go-live steps that need the Meta
# access token (which lives only in Supabase prod secrets, not in .env.local):
#
#   1. Confirm WHATSAPP_ACCESS_TOKEN is a *permanent* System User token (not 24h temp).
#   2. Register the webhook on Meta's side (callback URL + verify token + `messages`
#      field) and subscribe the WhatsApp Business Account to this app — the equiv.
#      of the dashboard "Configuration → Edit + Subscribe" clicks, via Graph API.
#
# Secrets are read from the environment first, then .env.local as a fallback.
# NOTHING secret is ever printed — only metadata (app_id, expiry, scopes, WABA id)
# and Graph API responses.
#
# Recommended (token never persisted to disk):
#   export WHATSAPP_ACCESS_TOKEN='EAAL...'   WHATSAPP_APP_SECRET='...'
#   bash scripts/wa-finish-setup.sh
#
set -euo pipefail

GV="v21.0"
CALLBACK="https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/whatsapp-cloud"
ENVF="$(dirname "$0")/../.env.local"

load() { grep -E "^$1=" "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'\r'; }
TOKEN="${WHATSAPP_ACCESS_TOKEN:-$(load WHATSAPP_ACCESS_TOKEN)}"
APP_SECRET="${WHATSAPP_APP_SECRET:-$(load WHATSAPP_APP_SECRET)}"
VERIFY="${WHATSAPP_VERIFY_TOKEN:-$(load WHATSAPP_VERIFY_TOKEN)}"

[ -z "$TOKEN" ]      && { echo "ERROR: WHATSAPP_ACCESS_TOKEN not set (export it, or add to .env.local)"; exit 1; }
[ -z "$APP_SECRET" ] && { echo "ERROR: WHATSAPP_APP_SECRET not set"; exit 1; }
[ -z "$VERIFY" ]     && { echo "ERROR: WHATSAPP_VERIFY_TOKEN not found in env or .env.local"; exit 1; }

echo "── 1. Token inspection (debug_token) ──────────────────────────────────"
DBG=$(curl -s -G "https://graph.facebook.com/$GV/debug_token" \
  --data-urlencode "input_token=$TOKEN" \
  --data-urlencode "access_token=$TOKEN")
if [ "$(echo "$DBG" | jq -r '.data.is_valid // false')" != "true" ]; then
  echo "  token is NOT valid:"; echo "$DBG" | jq -r '.data.error.message // .error.message // .' ; exit 1
fi
APP_ID=$(echo "$DBG" | jq -r '.data.app_id')
echo "  valid:    $(echo "$DBG" | jq -r '.data.is_valid')"
echo "  type:     $(echo "$DBG" | jq -r '.data.type')"
echo "  app_id:   $APP_ID"
echo "  scopes:   $(echo "$DBG" | jq -r '(.data.scopes // []) | join(", ")')"
EXP=$(echo "$DBG" | jq -r '.data.expires_at // 0')
if [ "$EXP" = "0" ]; then
  echo "  expires:  NEVER — permanent token ✅"
else
  echo "  expires:  $(date -r "$EXP" 2>/dev/null || echo "$EXP") ⚠️  NOT permanent — regenerate as a System User token"
fi
WABA=$(echo "$DBG" | jq -r '[.data.granular_scopes[]? | select(.scope|test("whatsapp_business")) | .target_ids[]?] | unique | .[0] // empty')
echo "  WABA id:  ${WABA:-<not found in granular scopes — set WABA_ID env to override>}"
WABA="${WABA_ID:-$WABA}"
echo ""

echo "── 2. Register webhook on the Meta app (callback + verify + messages) ──"
APP_TOKEN="${APP_ID}|${APP_SECRET}"
curl -s -X POST "https://graph.facebook.com/$GV/$APP_ID/subscriptions" \
  --data-urlencode "object=whatsapp_business_account" \
  --data-urlencode "callback_url=$CALLBACK" \
  --data-urlencode "verify_token=$VERIFY" \
  --data-urlencode "fields=messages" \
  --data-urlencode "access_token=$APP_TOKEN" | jq -c '.'
echo ""

echo "── 3. Subscribe the WABA to this app ──────────────────────────────────"
if [ -n "$WABA" ]; then
  curl -s -X POST "https://graph.facebook.com/$GV/$WABA/subscribed_apps" \
    --data-urlencode "access_token=$TOKEN" | jq -c '.'
  echo "  current subscribed_apps:"
  curl -s -G "https://graph.facebook.com/$GV/$WABA/subscribed_apps" \
    --data-urlencode "access_token=$TOKEN" | jq -c '.data'
else
  echo "  SKIPPED — no WABA id. Re-run with: WABA_ID=<id> bash scripts/wa-finish-setup.sh"
fi
echo ""

echo "── 4. Verify the app subscription stuck ───────────────────────────────"
curl -s -G "https://graph.facebook.com/$GV/$APP_ID/subscriptions" \
  --data-urlencode "access_token=$APP_TOKEN" \
  | jq -c '.data[]? | select(.object=="whatsapp_business_account") | {object, callback_url, active, fields: [.fields[]?.name]}'

echo ""
echo "Done. The function's GET handshake is already proven (curl returns the challenge),"
echo "so Meta's verification will pass the moment the subscription above is registered."
