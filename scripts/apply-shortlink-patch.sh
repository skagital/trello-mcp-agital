#!/usr/bin/env bash
# ============================================================
# apply-shortlink-patch.sh
# Wendet den shortLink-Patch auf einen frischen kocakli-Klon an
# Usage: ./scripts/apply-shortlink-patch.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Applying shortLink patch ==="

# --- validation.ts: Zod-Regex entfernen ---
VALIDATION="$ROOT_DIR/src/utils/validation.ts"
if [ -f "$VALIDATION" ]; then
    sed -i.bak \
        "s|z\.string()\.regex(/\^\[a-f0-9\]{24}\$/i, 'Must be a valid 24-character Trello ID')|z.string().min(1, 'ID must not be empty')|g" \
        "$VALIDATION"
    rm -f "$VALIDATION.bak"
    echo "[OK] validation.ts"
else
    echo "[SKIP] validation.ts not found"
fi

# --- Alle Tool-Dateien: JSON-Schema Pattern + Zod inline ---
for FILE in "$ROOT_DIR/src/tools/cards.ts" "$ROOT_DIR/src/tools/boards.ts" "$ROOT_DIR/src/tools/lists.ts" "$ROOT_DIR/src/tools/search.ts" "$ROOT_DIR/src/tools/advanced.ts"; do
    if [ -f "$FILE" ]; then
        BASENAME=$(basename "$FILE")

        # JSON-Schema Pattern
        sed -i.bak "s|\^\[a-f0-9\]{24}\$|^[a-zA-Z0-9]{1,24}\$|g" "$FILE"

        # Zod inline regex (in lists.ts, search.ts)
        sed -i.bak \
            "s|z\.string()\.regex(/\^\[a-f0-9\]{24}\$/, 'Invalid list ID format')|z.string().min(1, 'Invalid list ID format')|g" \
            "$FILE"
        sed -i.bak \
            "s|z\.string()\.regex(/\^\[a-f0-9\]{24}\$/, 'Invalid board ID format')|z.string().min(1, 'Invalid board ID format')|g" \
            "$FILE"
        sed -i.bak \
            "s|z\.string()\.regex(/\^\[a-f0-9\]{24}\$/, 'Invalid card ID format')|z.string().min(1, 'Invalid card ID format')|g" \
            "$FILE"

        rm -f "$FILE.bak"
        echo "[OK] $BASENAME"
    fi
done

# --- Tool-Beschreibungen in cards.ts aktualisieren ---
CARDS="$ROOT_DIR/src/tools/cards.ts"
if [ -f "$CARDS" ]; then
    sed -i.bak \
        "s|ID of the card to retrieve (you can get this from board details or searches)|Card ID (24-char hex), shortLink (8-char from URL), or full Trello URL|g" \
        "$CARDS"
    sed -i.bak \
        "s|ID of the card to update (you can get this from board details or card searches)|Card ID (24-char hex), shortLink (8-char from URL), or full Trello URL|g" \
        "$CARDS"
    sed -i.bak \
        "s|ID of the card to move (you can get this from board details or card searches)|Card ID (24-char hex), shortLink (8-char from URL), or full Trello URL|g" \
        "$CARDS"
    rm -f "$CARDS.bak"
    echo "[OK] cards.ts descriptions updated"
fi

echo ""
echo "=== Patch applied. Run 'npm run build' to compile. ==="
