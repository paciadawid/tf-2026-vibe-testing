#!/usr/bin/env bash
# Prints the address of the app under test, for exploring it with Playwright MCP.
#
#   bash base-url.sh <VARIABLE> <FALLBACK>
#
# Same order as the suite's playwright.config.ts: the variable from the terminal wins, then its
# line in the repository's .env, then the fallback. Reads only that one line of .env — the rest of
# the file holds keys and must never reach the screen.
set -euo pipefail

var="${1:?usage: base-url.sh <VARIABLE> <FALLBACK>}"
fallback="${2:?usage: base-url.sh <VARIABLE> <FALLBACK>}"
env_file="$(git rev-parse --show-toplevel)/.env"

url="${!var:-}"
if [ -z "$url" ] && [ -f "$env_file" ]; then
  url="$(grep -E "^${var}=" "$env_file" | tail -n 1 | cut -d= -f2- || true)"
  url="${url%\"}"; url="${url#\"}"; url="${url%\'}"; url="${url#\'}"
fi
url="${url:-$fallback}"

echo "${url%/}"
