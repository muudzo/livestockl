#!/bin/bash
set -e

# Start the txt.co.zw static-IP relay on this machine.
# Reads creds from .env in this directory; bind to PORT (default 8787).
#
# After this script starts the relay, run `ngrok http 8787` in a second
# terminal to expose it publicly. Update TXT_RELAY_URL Supabase secret
# with the ngrok URL.

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing .env. Create one with:"
  echo "  TXT_USERNAME=<remote_tatenda>"
  echo "  TXT_PASSWORD=<your-password>"
  echo "  RELAY_SECRET=<32+ char shared secret>"
  exit 1
fi

set -a; source .env; set +a

if ! command -v deno &> /dev/null; then
  echo "Deno not installed. Install: brew install deno"
  exit 1
fi

deno run --allow-net --allow-env relay.ts
