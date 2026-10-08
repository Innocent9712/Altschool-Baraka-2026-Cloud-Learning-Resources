#!/usr/bin/env bash
# ==============================================================================
# IMPERATIVE (no cloud needed): "Add a web server to the inventory"
# ==============================================================================
# Pretend servers/inventory.txt is our cloud account. Each line is a "server".
# Run this script 3 times, then look at the file. How many servers do you have?
# ==============================================================================
set -euo pipefail

mkdir -p servers
echo "web-server size=small env=dev" >> servers/inventory.txt

echo "Done. Current inventory:"
cat servers/inventory.txt
