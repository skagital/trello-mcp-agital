#!/usr/bin/env bash
# ============================================================
# generate-trello-context.sh
# Generiert trello-board-context.md aus der Trello API
# Für CI/CD, Cron, oder manuellen Aufruf
# ============================================================
# Voraussetzungen: curl, jq
# Usage: TRELLO_API_KEY=xxx TRELLO_TOKEN=yyy ./generate-trello-context.sh
# ============================================================

set -euo pipefail

# --- Konfiguration ---
BOARD_ID="${TRELLO_BOARD_ID:-56a7e3b1ed97adbf2a2515d9}"
API_KEY="${TRELLO_API_KEY:?Bitte TRELLO_API_KEY setzen}"
TOKEN="${TRELLO_TOKEN:?Bitte TRELLO_TOKEN setzen}"
OUTPUT="${OUTPUT_FILE:-trello-board-context.md}"
BASE_URL="https://api.trello.com/1"
AUTH="key=${API_KEY}&token=${TOKEN}"

echo "Fetching board metadata for ${BOARD_ID}..."

# --- Board-Info ---
BOARD=$(curl -s "${BASE_URL}/boards/${BOARD_ID}?${AUTH}&fields=name,url,desc")
BOARD_NAME=$(echo "$BOARD" | jq -r '.name')
BOARD_URL=$(echo "$BOARD" | jq -r '.url')

# --- Listen ---
LISTS=$(curl -s "${BASE_URL}/boards/${BOARD_ID}/lists?${AUTH}&filter=open&fields=id,name")

# --- Labels ---
LABELS=$(curl -s "${BASE_URL}/boards/${BOARD_ID}/labels?${AUTH}&fields=id,name,color,uses")

# --- Members ---
MEMBERS=$(curl -s "${BASE_URL}/boards/${BOARD_ID}/members?${AUTH}&fields=id,fullName,username")

# --- Datum ---
DATE=$(date -u +"%Y-%m-%d %H:%M UTC")

# --- Markdown generieren ---
cat > "$OUTPUT" << HEADER
# Trello Board Context: ${BOARD_NAME}
<!-- Auto-generated: ${DATE} | Board-ID: ${BOARD_ID} -->
<!-- URL: ${BOARD_URL} -->
<!-- Dieses File wird automatisch generiert. Nicht manuell editieren. -->

Dieses Dokument enthält die statischen Metadaten des ${BOARD_NAME} Boards.
Nutze diese IDs direkt bei Trello MCP Calls, ohne vorher das Board abzufragen.

## Listen (Workflow-Spalten)

| Spalte | ID |
|---|---|
HEADER

echo "$LISTS" | jq -r '.[] | "| \(.name) | \(.id) |"' >> "$OUTPUT"

cat >> "$OUTPUT" << 'LABEL_HEADER'

## Labels

| Label | ID | Farbe |
|---|---|---|
LABEL_HEADER

echo "$LABELS" | jq -r '.[] | select(.name != "") | "| \(.name) | \(.id) | \(.color // "-") |"' >> "$OUTPUT"

cat >> "$OUTPUT" << 'MEMBER_HEADER'

## Team-Mitglieder

| Name | ID | Username |
|---|---|---|
MEMBER_HEADER

echo "$MEMBERS" | jq -r '.[] | "| \(.fullName) | \(.id) | @\(.username) |"' >> "$OUTPUT"

cat >> "$OUTPUT" << 'FOOTER'

## Häufige Befehle (Referenz)

- **Meine PBIs finden:** `trello_search` mit query `@me`, boardIds mit der Board-ID oben
- **PBIs einer Spalte auflisten:** `trello_get_list_cards` mit der Listen-ID von oben
- **Karte per URL holen:** `get_card` mit dem shortLink aus der URL (z.B. `6DOiJhV0` aus `trello.com/c/6DOiJhV0/...`)
FOOTER

echo "Kontext-Datei generiert: ${OUTPUT}"
echo "Listen: $(echo "$LISTS" | jq length), Labels: $(echo "$LABELS" | jq length), Members: $(echo "$MEMBERS" | jq length)"
