# agital Trello MCP Server

Gepatchter Trello MCP Server für die agital.online Entwicklungsabteilung. Basiert auf [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP) mit folgenden Verbesserungen:

- **shortLink-Support:** Karten können direkt per URL oder shortLink referenziert werden (z.B. `6DOiJhV0` aus `trello.com/c/6DOiJhV0/...`), statt nur per 24-Zeichen Hex-ID
- **Board-Kontext-Datei:** Auto-generierte `trello-board-context.md` mit allen Listen, Labels und Members, damit Claude nicht bei jedem Call das Board durchsuchen muss
- **Zwei Verteilungswege:** `.mcpb` Desktop Extension für Claude Desktop, CLI-Setup für Claude Code

## Schnellstart

### Für Claude Desktop Nutzer

1. Lade die neueste `trello-agital.mcpb` aus den [Releases](../../releases) herunter
2. Doppelklicke die Datei (oder: Claude Desktop → Settings → Extensions → Install Extension)
3. Gib deinen Trello API Key und Token ein, wenn du danach gefragt wirst
4. Fertig. Starte einen neuen Chat.

**API-Credentials besorgen:**
- Gehe zu https://trello.com/power-ups/admin
- Kopiere deinen API Key
- Klicke "Token generieren" (read/write, never expires)

### Für Claude Code Nutzer (CLI)

**Voraussetzung:** Node.js 18+ muss installiert sein.

**Schritt 1: Repo klonen und bauen**

```bash
git clone git@github.com:agital-online/trello-mcp.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install
npm run build
```

**Schritt 2: MCP Server registrieren (einmalig)**

```bash
claude mcp add trello-agital --scope user \
  -e TRELLO_API_KEY="DEIN_API_KEY" \
  -e TRELLO_TOKEN="DEIN_TOKEN" \
  -- node ~/.local/share/agital/trello-mcp/dist/index.js
```

**Schritt 3: Prüfen ob es funktioniert**

```bash
claude mcp list
# Sollte "trello-agital: connected" zeigen
```

Starte Claude Code neu. Teste mit: "Hol mir die Karte 6DOiJhV0"

## Board-Kontext

Die Datei `trello-board-context.md` enthält alle Listen, Labels und Team-Mitglieder mit ihren Trello-IDs. Sie wird wöchentlich automatisch per GitHub Action aktualisiert.

**Warum?** Ohne diese Datei muss Claude bei jedem PBI-Erstellen oder -Bearbeiten erst das komplette Board abfragen, um Listen-IDs, Label-IDs und Member-IDs zu finden. Mit der Kontext-Datei kennt Claude alle IDs sofort und braucht nur einen einzigen API-Call.

**Nutzung in Claude Code:** Referenziere die Datei in deiner `CLAUDE.md`:

```markdown
Für Trello Board-Metadaten (Listen, Labels, Members) siehe:
~/.local/share/agital/trello-mcp/trello-board-context.md
```

**Nutzung in Claude Desktop:** Lade die Datei als Project Knowledge in dein Claude Desktop Projekt hoch.

**Manuell aktualisieren:**

```bash
cd ~/.local/share/agital/trello-mcp
TRELLO_API_KEY="dein-key" TRELLO_TOKEN="dein-token" ./scripts/generate-trello-context.sh
```

## Beispiel-Befehle

Nach dem Setup kannst du Claude z.B. sagen:

| Befehl | Was passiert |
|---|---|
| "Hol mir die Karte https://trello.com/c/6DOiJhV0" | Karte direkt per URL abrufen |
| "Erstelle ein PBI 'Login-Bug fixen' in Working, Label esyoil, assign Bennet" | Erstellt Karte mit einem API-Call (IDs aus Kontext) |
| "Zeig mir meine PBIs" | Sucht via `@me` nach deinen zugewiesenen Karten |
| "Was liegt in 'Zu priorisierende Projekte'?" | Listet alle Karten der Spalte auf |
| "Verschiebe Karte X nach 'In Code Review'" | Verschiebt per Listen-ID aus Kontext |

## Architektur

```
trello-mcp/
├── src/                            # TypeScript Server-Code (gepatchter kocakli Fork)
│   ├── index.ts                    # MCP Server Entry Point
│   ├── tools/
│   │   ├── cards.ts                # get_card, create_card, update_card, move_card
│   │   ├── boards.ts              # list_boards, get_board_details, get_lists
│   │   ├── lists.ts               # get_list_cards, create_list, add_comment
│   │   ├── search.ts              # trello_search
│   │   ├── members.ts             # get_user_boards, get_member
│   │   └── advanced.ts            # get_board_cards, card_actions, attachments, checklists
│   ├── trello/client.ts           # Trello API Client mit Retry-Logik
│   └── utils/validation.ts        # Zod-Validierung (gepatcht: akzeptiert shortLinks)
├── dist/                           # Kompiliertes JavaScript
├── scripts/
│   └── generate-trello-context.sh  # Board-Kontext Generator
├── trello-board-context.md         # Auto-generierte Board-Metadaten
├── manifest.json                   # MCPB Manifest für Desktop Extension
├── .github/workflows/
│   ├── update-trello-context.yml   # Wöchentlicher Kontext-Update
│   └── build-mcpb.yml             # .mcpb Release-Pipeline
└── package.json
```

## Patches gegenüber Upstream

Folgende Änderungen wurden am Original-kocakli-Server vorgenommen:

1. **`src/utils/validation.ts`**: Zod-Regex von `^[a-f0-9]{24}$` auf `z.string().min(1)` geändert, damit shortLinks und nicht nur Hex-IDs akzeptiert werden
2. **`src/tools/cards.ts`**: JSON-Schema Pattern von `^[a-f0-9]{24}$` auf `^[a-zA-Z0-9]{1,24}$` geändert, Tool-Beschreibungen aktualisiert
3. **`src/tools/lists.ts`**, **`src/tools/search.ts`**, **`src/tools/boards.ts`**: Gleiche Pattern-Anpassungen
4. Keine funktionalen Änderungen am API-Client oder der Server-Logik

## Entwicklung

```bash
# Dependencies installieren
npm install

# TypeScript kompilieren
npm run build

# Type-Checking
npm run type-check

# .mcpb Paket bauen (benötigt @anthropic-ai/mcpb)
npm run build:mcpb
```

## Lizenz

Basiert auf [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP) (MIT License).
Patches und Erweiterungen: agital.online GmbH, intern.
