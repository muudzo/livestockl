#!/usr/bin/env bash
# ZimLivestock USSD Demo
# Replays the full bid flow using Africa's Talking webhook format.
# Use AT Simulator (https://simulator.africastalking.com) for visual demo,
# or run this script directly against the deployed function.
#
# Usage:
#   ./scripts/demo-ussd.sh [FUNCTION_URL]
#
# FUNCTION_URL defaults to the Supabase-hosted function.
# The AT Simulator POST endpoint mirrors this format exactly.

set -euo pipefail

BASE="${1:-https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/ussd-handler}"
SESSION="demo-$(date +%s)"
PHONE="+263771111111"
CODE="*151*ZL#"

# Colour helpers
G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; R='\033[0m'

at_post() {
  local text="$1"
  echo -e "${Y}► Input:${R} \"${text:-<dial>}\""
  curl -s -X POST "$BASE" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "sessionId=$SESSION" \
    --data-urlencode "serviceCode=$CODE" \
    --data-urlencode "phoneNumber=$PHONE" \
    --data-urlencode "text=$text"
  echo ""
  echo ""
}

echo -e "${C}=== ZimLivestock USSD Demo ===${R}"
echo -e "Phone: $PHONE  |  Code: $CODE  |  Session: $SESSION"
echo ""

echo -e "${G}[1/6] Dial in — main menu${R}"
at_post ""
sleep 1

echo -e "${G}[2/6] Browse active lots${R}"
at_post "1"
sleep 1

echo -e "${G}[3/6] Navigate to Bid${R}"
at_post "2"
sleep 1

echo -e "${G}[4/6] Enter lot reference${R}"
at_post "2*AUCT-001"
sleep 1

echo -e "${G}[5/6] Enter bid amount${R}"
at_post "2*AUCT-001*500"
sleep 1

echo -e "${G}[6/6] Confirm bid${R}"
at_post "2*AUCT-001*500*1"
sleep 1

echo ""
echo -e "${C}--- Pay flow ---${R}"
echo ""

echo -e "${G}[7/8] Pay for a lot${R}"
at_post "3"
sleep 1

echo -e "${G}[8/8] Confirm EcoCash payment${R}"
at_post "3*AUCT-001*1"

echo ""
echo -e "${C}Done. Open https://simulator.africastalking.com to run this interactively.${R}"
