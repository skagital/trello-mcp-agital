# agital Trello MCP Server — Setup & Nutzung

Vollständige Dokumentation für den internen Trello MCP Server der agital.online GmbH.
Deckt die Einrichtung auf **Windows**, **macOS** und **Linux** ab,
sowohl für Claude Desktop als auch für Claude Code (CLI).

---

## Inhaltsverzeichnis

1. [Was ist das?](#was-ist-das)
2. [Voraussetzungen](#voraussetzungen)
3. [Trello API Credentials besorgen](#trello-api-credentials-besorgen)
4. [Setup: Claude Desktop](#setup-claude-desktop)
5. [Setup: Claude Code CLI](#setup-claude-code-cli)
6. [Board-Kontext-Datei einrichten](#board-kontext-datei-einrichten)
7. [Nutzung im Alltag](#nutzung-im-alltag)
8. [Befehlsreferenz](#befehlsreferenz)
9. [Troubleshooting](#troubleshooting)
10. [Für Maintainer: Server aktualisieren](#für-maintainer-server-aktualisieren)

---

## Was ist das?

Ein MCP-Server (Model Context Protocol), der Claude mit eurem Trello Product Backlog Board verbindet.
Damit könnt ihr direkt aus Claude heraus PBIs erstellen, bearbeiten, verschieben und abfragen,
ohne Trello im Browser öffnen zu müssen.

Besonderheiten gegenüber dem Standard-Trello-MCP:

- **shortLink-Support:** Karten können per URL referenziert werden. Einfach die Trello-URL reinkopieren, statt eine 24-Zeichen-ID zu suchen.
- **Board-Kontext-Cache:** Eine auto-generierte Referenzdatei mit allen Listen, Labels und Team-Mitgliedern. Claude kennt dadurch alle IDs sofort und muss nicht bei jedem Call erst das Board durchsuchen.

---

## Voraussetzungen

| Was | Wofür | Prüfen |
|---|---|---|
| Trello Account | Zugriff auf Product Backlog Board | — |
| Claude Desktop und/oder Claude Code | KI-Client | — |
| Node.js 18+ | Nur für Claude Code CLI Setup nötig | `node --version` |
| Git | Nur für Claude Code CLI Setup nötig | `git --version` |

Claude Desktop bringt eine eigene Node.js Runtime mit. Für das Setup über die `.mcpb` Extension ist kein Node.js nötig.

---

## Trello API Credentials besorgen

Jeder Entwickler braucht seinen eigenen API Key und Token. Diese werden niemals geteilt.

### Schritt 1: API Key holen

1. Öffne https://trello.com/power-ups/admin
2. Falls du noch kein Power-Up hast, erstelle eines (Name ist egal, z.B. "Claude MCP")
3. Kopiere den **API Key**

### Schritt 2: Token generieren

1. Auf der gleichen Seite, klicke "Token manuell generieren" (oder den Link daneben)
2. Wähle:
   - **Scope:** read, write
   - **Expiration:** never
3. Autorisiere den Zugriff
4. Kopiere den **Token**

Bewahre beides sicher auf (z.B. in einem Passwort-Manager).

---

## Setup: Claude Desktop

Funktioniert auf **Windows und macOS** identisch.

### Option A: Über die Organisation (empfohlen)

Falls ein Admin die Extension im Team-Verzeichnis bereitgestellt hat:

1. Öffne Claude Desktop
2. Gehe zu **Settings → Extensions**
3. Suche nach "Trello agital.online"
4. Klicke **Installieren**
5. Gib deinen **Trello API Key** und **Token** ein
6. Fertig

### Option B: Manuelle Installation per .mcpb

1. Lade die neueste `.mcpb` aus den [GitHub Releases](https://github.com/skagital/trello-mcp-agital/releases) herunter
2. In Claude Desktop: **Settings → Extensions → Install Extension** und die `.mcpb` Datei auswählen
   (Doppelklick auf die Datei funktioniert unter macOS, unter Windows je nach Konfiguration)
3. Gib deinen **Trello API Key** und **Token** ein, wenn du danach gefragt wirst
4. Die Credentials werden verschlüsselt gespeichert (Windows: Credential Manager, macOS: Keychain)
5. Starte einen neuen Chat und teste: `Zeig mir Karte 6DOiJhV0`

### Verbindung prüfen

Nach der Installation sollte unter Settings → Extensions "Trello agital.online" als "Aktiviert" erscheinen.
Falls stattdessen "Server disconnected" erscheint, siehe [Troubleshooting](#troubleshooting).

---

## Setup: Claude Code CLI

### Schritt 1: Repo klonen und bauen

**macOS / Linux:**

```bash
git clone https://github.com/skagital/trello-mcp-agital.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install
npm run build
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/skagital/trello-mcp-agital.git "$env:LOCALAPPDATA\agital\trello-mcp"
cd "$env:LOCALAPPDATA\agital\trello-mcp"
npm install
npm run build
```

Prüfen ob der Build erfolgreich war:

```bash
# macOS/Linux
ls dist/index.js

# Windows (PowerShell)
Test-Path dist\index.js
```

### Schritt 2: MCP Server registrieren

Der Server wird im `user` Scope registriert, d.h. er ist in **allen** Projekten verfügbar.

**macOS / Linux:**

```bash
claude mcp add trello-agital --scope user \
  -e TRELLO_API_KEY="DEIN_API_KEY" \
  -e TRELLO_TOKEN="DEIN_TOKEN" \
  -- node ~/.local/share/agital/trello-mcp/dist/index.js
```

**Windows (PowerShell):**

```powershell
claude mcp add trello-agital --scope user `
  -e TRELLO_API_KEY="DEIN_API_KEY" `
  -e TRELLO_TOKEN="DEIN_TOKEN" `
  -- node "$env:LOCALAPPDATA\agital\trello-mcp\dist\index.js"
```

### Schritt 3: Verbindung prüfen

```bash
claude
# Im Claude Code Prompt:
/mcp
# Sollte "trello-agital: connected" anzeigen
```

### Hinweis zu den Scopes

| Scope | Wo gespeichert | Sichtbar für | Wann nutzen |
|---|---|---|---|
| `local` | `~/.claude.json` (projektspezifisch) | Nur du, nur dieses Projekt | Zum Experimentieren |
| `project` | `.mcp.json` im Repo | Alle die das Repo klonen | Geteilte Server ohne Credentials |
| `user` | `~/.claude.json` (global) | Nur du, alle Projekte | **Unser Standard** |

Wir nutzen `user` Scope, weil der Trello-Zugriff projektübergreifend gebraucht wird und die Credentials privat bleiben müssen.

---

## Board-Kontext-Datei einrichten

Die Datei `trello-board-context.md` enthält alle Listen-IDs, Label-IDs und Member-IDs
des Product Backlog Boards. Sie wird wöchentlich automatisch per GitHub Action aktualisiert.

### Warum?

Ohne die Kontext-Datei muss Claude bei jedem PBI-Erstellen erst das gesamte Board abfragen
(2-3 API-Calls, viele Tokens). Mit der Kontext-Datei kennt Claude alle IDs sofort.

### Einrichten in Claude Code

Füge in die `CLAUDE.md` deines Projekts folgende Zeile ein:

**macOS / Linux:**

```markdown
Für Trello Board-Metadaten (Listen, Labels, Members) siehe:
~/.local/share/agital/trello-mcp/trello-board-context.md
```

**Windows:**

```markdown
Für Trello Board-Metadaten (Listen, Labels, Members) siehe:
%LOCALAPPDATA%\agital\trello-mcp\trello-board-context.md
```

### Einrichten in Claude Desktop

1. Öffne dein Projekt in Claude Desktop
2. Gehe zu Project Knowledge
3. Lade die Datei `trello-board-context.md` aus dem Repo hoch

### Aktualisierung

Die GitHub Action aktualisiert die Datei jeden Montag automatisch. Ein `git pull` im lokalen Repo reicht.

Manuell aktualisieren (macOS/Linux, benötigt `curl` und `jq`):

```bash
cd ~/.local/share/agital/trello-mcp
TRELLO_API_KEY="key" TRELLO_TOKEN="token" bash scripts/generate-trello-context.sh
```

---

## Nutzung im Alltag

Alle Beispiele funktionieren in Claude Desktop und Claude Code identisch, auf allen Plattformen.

### Karte per URL abrufen

```
Hol mir die Karte https://trello.com/c/6DOiJhV0/123-login-bug
```

Oder nur den shortLink (die 8 Zeichen nach `/c/`):

```
Zeig mir Karte 6DOiJhV0
```

### PBI erstellen

```
Erstelle ein PBI "Login-Seite responsive machen" in der Spalte "In Vorbereitung",
Label "esyoil", zugewiesen an Bennet Gallein.
```

### Meine PBIs anzeigen

```
Zeig mir alle meine zugewiesenen PBIs
```

```
Was liegt bei mir in "Working"?
```

```
Welche PBIs sind mir in "Zu priorisierende Projekte" zugewiesen?
```

### PBI bearbeiten

```
Ändere die Beschreibung von Karte 6DOiJhV0 auf:
"Als Nutzer möchte ich die Login-Seite auch auf dem Handy nutzen können."
```

### PBI verschieben

```
Verschiebe Karte 6DOiJhV0 nach "In Code Review"
```

### Kommentar hinzufügen

```
Füge einen Kommentar zu Karte 6DOiJhV0 hinzu:
"PR ist erstellt, wartet auf Review von @bg_esy"
```

### Spalte auflisten

```
Was liegt alles in "QS Staging"?
```

### Suche

```
Suche nach "responsive" im Product Backlog
```

---

## Befehlsreferenz

| Tool | Beschreibung | Beispiel-Trigger |
|---|---|---|
| `get_card` | Karte per ID/shortLink/URL abrufen | "Zeig mir Karte X" |
| `create_card` | Neue Karte erstellen | "Erstelle ein PBI..." |
| `update_card` | Karte bearbeiten | "Ändere die Beschreibung von..." |
| `move_card` | Karte in andere Spalte verschieben | "Verschiebe Karte X nach Y" |
| `trello_add_comment` | Kommentar hinzufügen | "Kommentiere auf Karte X..." |
| `trello_search` | Volltextsuche | "Suche nach..." |
| `trello_get_list_cards` | Karten einer Spalte auflisten | "Was liegt in Working?" |
| `get_board_details` | Board-Struktur anzeigen | "Zeig mir das Board" |
| `get_lists` | Alle Spalten auflisten | "Welche Spalten gibt es?" |
| `trello_get_board_members` | Board-Mitglieder anzeigen | "Wer ist im Board?" |
| `trello_get_board_labels` | Labels anzeigen | "Welche Labels gibt es?" |
| `trello_get_board_cards` | Alle Karten des Boards | "Zeig mir alle offenen Karten" |
| `trello_get_card_actions` | Aktivitätsverlauf | "Was ist auf Karte X passiert?" |
| `trello_get_card_attachments` | Anhänge einer Karte | "Welche Anhänge hat Karte X?" |
| `trello_get_card_checklists` | Checklisten einer Karte | "Zeig mir die Checkliste von X" |

---

## Troubleshooting

### Claude Desktop: "Server disconnected"

Häufigste Ursachen:

1. **Credentials falsch:** Settings → Extensions → Trello agital.online → Konfigurieren. API Key und Token prüfen. Test:
   ```bash
   # macOS/Linux
   curl -s "https://api.trello.com/1/boards/56a7e3b1ed97adbf2a2515d9?key=DEIN_KEY&token=DEIN_TOKEN&fields=name"
   ```
   ```powershell
   # Windows
   Invoke-RestMethod "https://api.trello.com/1/boards/56a7e3b1ed97adbf2a2515d9?key=DEIN_KEY&token=DEIN_TOKEN&fields=name"
   ```
   Sollte `Product Backlog` zurückgeben.

2. **Alte Version gecached:** Extension deinstallieren, Claude Desktop komplett schließen (auch System Tray / Menüleiste), prüfen ob der Ordner unter `%APPDATA%\Claude\Claude Extensions\` gelöscht wurde, Claude Desktop starten, Extension neu installieren.

3. **Generelles Extension-Problem:** Prüfe ob andere Extensions (z.B. Desktop Commander) funktionieren. Falls nein, ist es ein Claude Desktop Problem, nicht unser Server.

### Claude Code: "trello-agital: disconnected"

```bash
# Registrierung prüfen
claude mcp list

# Server manuell testen
node ~/.local/share/agital/trello-mcp/dist/index.js
# Sollte ohne Ausgabe hängen (wartet auf stdin). Ctrl+C zum Beenden.
# Falls sofort beendet: TRELLO_API_KEY und TRELLO_TOKEN als Env-Vars setzen.
```

### Windows: ExecutionPolicy blockiert Scripts

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Windows: node wird nicht gefunden

```powershell
where.exe node
```

Den vollen Pfad dann im `claude mcp add` Befehl verwenden.

### macOS: Permission denied

```bash
chmod +x ~/.local/share/agital/trello-mcp/scripts/*.sh
```

### Linux: jq nicht installiert

```bash
# Debian/Ubuntu
sudo apt install jq

# Arch
sudo pacman -S jq
```

---

## Für Maintainer: Server aktualisieren

### Upstream-Änderungen übernehmen

```bash
cd ~/.local/share/agital/trello-mcp

# Upstream als Remote hinzufügen (einmalig)
git remote add upstream https://github.com/kocakli/Trello-Desktop-MCP.git

git fetch upstream
git diff upstream/main -- src/

# Nach dem Merge: Prüfen ob shortLink-Patch noch vollständig ist
grep -r "a-f0-9" src/
# MUSS leer sein! Falls nicht, Patch erneut anwenden.

npm run build
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

Die `.mcpb` erscheint unter [Releases](https://github.com/skagital/trello-mcp-agital/releases).
Für die Organisation: Admins laden die neue `.mcpb` im Claude Team Extension-Verzeichnis hoch.

### Wichtige Regeln (siehe docs/LESSONS_LEARNED.md)

- Kein manueller Initialize Handler im Server-Code
- MCP SDK Version >= 1.27.1
- `manifest_version: "0.3"` in manifest.json
- `${__dirname}` in mcp_config.args
- Immer `grep -r "a-f0-9" src/` vor dem Release (muss leer sein)

---

## Kontakt

Bei Fragen oder Problemen: Sören Kann (@sk_esy)
