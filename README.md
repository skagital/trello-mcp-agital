# agital Trello MCP Server

Trello MCP Server für die agital.online Entwicklungsabteilung. Basiert auf [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP) mit folgenden Verbesserungen:

- **shortLink-Support:** Karten können direkt per URL oder shortLink referenziert werden (z.B. `6DOiJhV0` aus `trello.com/c/6DOiJhV0/...`), statt nur per 24-Zeichen Hex-ID
- **Board-Kontext-Datei:** Auto-generierte `trello-board-context.md` mit allen Listen, Labels und Members, damit Claude nicht bei jedem Call das Board durchsuchen muss
- **Zwei Verteilungswege:** `.mcpb` Desktop Extension (Claude Desktop) und CLI-Setup (Claude Code)
- **Protokoll-kompatibel:** Kein manueller Initialize Handler, das SDK handled die Protokoll-Negotiation automatisch (kompatibel mit `2025-11-25`)

## Schnellstart

### Für Claude Desktop Nutzer (Windows, macOS)

1. Lade die neueste `.mcpb` aus den [Releases](../../releases) herunter
2. Doppelklicke die Datei oder installiere über Claude Desktop: Settings → Extensions → Install Extension
3. Gib deinen Trello API Key und Token ein
4. Fertig. Starte einen neuen Chat und teste: `Zeig mir Karte 6DOiJhV0`

**Oder über die Organisation:** Falls ein Admin die Extension im Team-Verzeichnis hochgeladen hat, findest du sie unter Settings → Extensions.

### Für Claude Code Nutzer (CLI)

```bash
git clone https://github.com/skagital/trello-mcp-agital.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install && npm run build

claude mcp add trello-agital --scope user \
  -e TRELLO_API_KEY="DEIN_KEY" \
  -e TRELLO_TOKEN="DEIN_TOKEN" \
  -- node ~/.local/share/agital/trello-mcp/dist/index.js
```

Vollständige Anleitung für alle Plattformen: [docs/SETUP.md](docs/SETUP.md)

## API Credentials besorgen

1. Gehe zu https://trello.com/power-ups/admin
2. Erstelle ein Power-Up (Name egal) und kopiere den **API Key**
3. Klicke "Token generieren" (Scope: read/write, Expiration: never)
4. Kopiere den **Token**

## Board-Kontext

Die Datei `trello-board-context.md` enthält alle Listen-IDs, Label-IDs und Member-IDs. Sie wird wöchentlich automatisch aktualisiert (GitHub Action). Damit kennt Claude alle IDs sofort und braucht nicht bei jedem Call das Board zu durchsuchen.

Nutzung: In der `CLAUDE.md` deines Projekts referenzieren oder als Project Knowledge in Claude Desktop hochladen.

## Beispiel-Befehle

| Befehl | Was passiert |
|---|---|
| "Hol mir die Karte https://trello.com/c/6DOiJhV0" | Karte direkt per URL abrufen |
| "Erstelle ein PBI 'Login-Bug fixen' in Working, Label esyoil, assign Bennet" | Erstellt Karte mit einem API-Call |
| "Zeig mir meine PBIs" | Sucht via `@me` nach zugewiesenen Karten |
| "Was liegt in 'Zu priorisierende Projekte'?" | Listet alle Karten der Spalte |
| "Verschiebe Karte X nach 'In Code Review'" | Verschiebt per Listen-ID aus Kontext |
| "Erstelle eine Checklist 'Akzeptanzkriterien' auf Karte X" | Legt Checklist an |
| "Häng den Screenshot C:/Users/.../bug.png an Karte X" | Lädt Datei als Attachment hoch |

## Architektur

```
trello-mcp-agital/
├── src/
│   ├── index.ts                    # MCP Server Entry Point (kein manueller Initialize Handler)
│   ├── tools/
│   │   ├── cards.ts                # get_card, create_card, update_card, move_card
│   │   ├── boards.ts              # list_boards, get_board_details, get_lists
│   │   ├── lists.ts               # get_list_cards, create_list, add_comment
│   │   ├── search.ts              # trello_search
│   │   ├── members.ts             # get_user_boards, get_member
│   │   ├── advanced.ts            # board_cards, card_actions, attachments, checklists (read)
│   │   ├── checklists.ts          # create_checklist, add/update/delete checklist items
│   │   └── attachments.ts         # add_attachment_url, add_attachment_file, delete_attachment
│   ├── trello/client.ts           # Trello API Client mit Retry-Logik
│   └── utils/validation.ts        # Zod-Validierung (gepatcht: akzeptiert shortLinks)
├── dist/                           # Kompiliertes JavaScript (ESM)
├── scripts/
│   └── generate-trello-context.sh  # Board-Kontext Generator
├── trello-board-context.md         # Auto-generierte Board-Metadaten
├── manifest.json                   # MCPB Manifest (Version 0.3)
├── .github/workflows/
│   ├── update-trello-context.yml   # Wöchentlicher Kontext-Update
│   └── build-mcpb.yml             # .mcpb Release-Pipeline bei Git Tags
├── docs/
│   ├── SETUP.md                   # Vollständige Setup-Anleitung
│   └── LESSONS_LEARNED.md         # Learnings aus der Entwicklung
└── package.json                    # type: module, SDK ^1.27.1
```

## Patches gegenüber Upstream

1. **Manueller Initialize Handler entfernt:** Das SDK handled die Protokoll-Negotiation automatisch. Der Upstream-Handler hardcoded `protocolVersion: '2024-11-05'`, was mit Claude Desktop inkompatibel ist.
2. **MCP SDK auf ^1.27.1 gepinnt:** Unterstützt Protokoll `2025-11-25`.
3. **shortLink-Validierung gelockert:** Zod-Regex `^[a-f0-9]{24}$` durch `z.string().min(1)` ersetzt, JSON-Schema Pattern durch `^[a-zA-Z0-9]{1,24}$` ersetzt. Betrifft `validation.ts`, `cards.ts`, `boards.ts`, `lists.ts`, `search.ts`, `advanced.ts`.
4. **Unnötige Handler entfernt:** `ListResourcesRequestSchema`, `ListPromptsRequestSchema`, `uncaughtException`/`unhandledRejection` Handler entfernt.

## Entwicklung

```bash
npm install
npm run build

# Prüfen ob shortLink-Patch vollständig angewendet ist
grep -r "a-f0-9" src/
# Muss leer sein!
```

### Neuen Release erstellen

```bash
# Version in package.json und manifest.json hochzählen
git add -A
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
# GitHub Action baut automatisch die .mcpb Datei
```

Siehe [docs/LESSONS_LEARNED.md](docs/LESSONS_LEARNED.md) für Checklisten und bekannte Fallstricke.

## Lizenz

Basiert auf [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP) (MIT License).
