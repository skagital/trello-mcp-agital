#!/usr/bin/env bash
# ============================================================
# setup-repo.sh
# Initialisiert das agital trello-mcp Repo aus dem kocakli Upstream
# Usage: ./scripts/setup-repo.sh
# ============================================================
# Dieses Script wird einmalig ausgeführt, um das Repo aufzusetzen.
# Danach wird der Server-Code direkt in diesem Repo gepflegt.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Setting up agital trello-mcp ==="

# --- Schritt 1: Upstream klonen (temporär) ---
TEMP_DIR=$(mktemp -d)
echo "Cloning kocakli/Trello-Desktop-MCP..."
git clone --depth 1 https://github.com/kocakli/Trello-Desktop-MCP.git "$TEMP_DIR/upstream"

# --- Schritt 2: Server-Code kopieren ---
echo "Copying server source..."
cp -r "$TEMP_DIR/upstream/src/"* "$ROOT_DIR/src/"
cp "$TEMP_DIR/upstream/tsconfig.json" "$ROOT_DIR/tsconfig.json" 2>/dev/null || true

# --- Schritt 3: Dependencies aus upstream package.json übernehmen ---
# (Wir behalten unsere eigene package.json, installieren aber die gleichen deps)
echo "Installing dependencies..."
cd "$ROOT_DIR"
npm install

# --- Schritt 4: Patch anwenden ---
echo "Applying shortLink patch..."
bash "$SCRIPT_DIR/apply-shortlink-patch.sh"

# --- Schritt 5: Build ---
echo "Building..."
npm run build

# --- Schritt 6: Aufräumen ---
rm -rf "$TEMP_DIR"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Nächste Schritte:"
echo "  1. git add -A && git commit -m 'Initial setup: patched kocakli fork'"
echo "  2. git push"
echo "  3. GitHub Secrets setzen: TRELLO_API_KEY, TRELLO_TOKEN"
echo "  4. Team informieren (README.md enthält die Setup-Anleitung)"
