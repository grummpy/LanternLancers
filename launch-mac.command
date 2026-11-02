#!/usr/bin/env bash
# One-click launcher for Lantern Lancers on macOS.
set -euo pipefail
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi
if command -v python >/dev/null 2>&1; then
  exec python server.py
fi
echo "Python 3 is required to launch Lantern Lancers."
echo "Install Python 3 from https://www.python.org/downloads/ and try again."
exit 1
