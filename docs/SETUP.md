# agital Trello MCP Server — Setup & Nutzung

Vollständige Dokumentation für den internen Trello MCP Server der agital.online GmbH.
Dieses Dokument richtet sich an alle Entwickler im Team und deckt die Einrichtung
auf **Windows**, **macOS** und **Linux** ab, sowohl für Claude Desktop als auch für Claude Code (CLI).

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
| Node.js 18+ | Server bauen und ausführen | `node --version` |
| Git | Repo klonen | `git --version` |
| Trello Account | Zugriff auf Product Backlog Board | — |
| Claude Desktop und/oder Claude Code | KI-Client | — |

**Hinweis für Windows:** Falls Node.js nicht global verfügbar ist (z.B. hinter nvm4w),
notiere dir den vollen Pfad zur `node.exe` (z.B. `C:\nvm4w\nodejs\node.exe`).

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

Bewahre beides sicher auf (z.B. in einem Passwort-Manager). Du brauchst Key und Token für das Setup.

---

## Setup: Claude Desktop

### Option A: Desktop Extension (.mcpb) — Empfohlen

Die einfachste Methode. Kein Terminal nötig. Funktioniert auf **Windows und macOS** identisch.

1. Lade die neueste `trello-agital.mcpb` aus den
   [GitHub Releases](https://github.com/skagital/trello-mcp-agital/releases) herunter
2. Doppelklicke die Datei. Claude Desktop öffnet den Installations-Dialog.
3. Gib deinen **Trello API Key** und **Token** ein, wenn du danach gefragt wirst
4. Fertig. Die Credentials werden verschlüsselt gespeichert (Windows: Credential Manager, macOS: Keychain).
5. Starte einen neuen Chat und teste: `Zeig mir meine PBIs`

### Option B: Manuelle Konfiguration

Falls die .mcpb nicht funktioniert oder du mehr Kontrolle willst.

#### Schritt 1: Repo klonen und bauen

**Windows (PowerShell):**

```powershell
git clone https://github.com/skagital/trello-mcp-agital.git "$env:APPDATA\Claude\mcp-servers\trello-mcp"
cd "$env:APPDATA\Claude\mcp-servers\trello-mcp"
npm install
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\apply-shortlink-patch.ps1
npm run build
```

**macOS:**

```bash
git clone https://github.com/skagital/trello-mcp-agital.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install
npm run build
```

**Linux:**

```bash
git clone https://github.com/skagital/trello-mcp-agital.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install
npm run build
```

#### Schritt 2: Claude Desktop Config bearbeiten

**Windows:** Öffne die Config in einem Editor:

```powershell
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

**macOS:**

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Linux:**

```bash
code ~/.config/Claude/claude_desktop_config.json
```

#### Schritt 3: Server-Eintrag hinzufügen

Füge den `trello-agital` Block in das `mcpServers`-Objekt ein. Falls schon andere Server
konfiguriert sind, füge den Block komma-getrennt hinzu.

**Windows:**

```json
{
  "mcpServers": {
    "trello-agital": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": ["C:\\Users\\DEIN_USERNAME\\AppData\\Roaming\\Claude\\mcp-servers\\trello-mcp\\dist\\index.js"],
      "env": {
        "TRELLO_API_KEY": "DEIN_API_KEY",
        "TRELLO_TOKEN": "DEIN_TOKEN"
      }
    }
  }
}
```

Ersetze `DEIN_USERNAME` mit deinem Windows-Usernamen und passe den `node.exe` Pfad an,
falls Node.js bei dir woanders liegt. Falls Node.js global installiert ist, reicht `"command": "node"`.

**macOS / Linux:**

```json
{
  "mcpServers": {
    "trello-agital": {
      "command": "node",
      "args": ["/Users/DEIN_USERNAME/.local/share/agital/trello-mcp/dist/index.js"],
      "env": {
        "TRELLO_API_KEY": "DEIN_API_KEY",
        "TRELLO_TOKEN": "DEIN_TOKEN"
      }
    }
  }
}
```

Hinweis: `~` wird in JSON nicht aufgelöst, daher den vollen Pfad verwenden.
Auf Linux entsprechend `/home/DEIN_USERNAME/...`.

#### Schritt 4: Neustart und Test

Claude Desktop komplett beenden (nicht nur Fenster schließen, sondern auch aus dem
System Tray bzw. der Menüleiste) und neu starten.
In einem neuen Chat testen: `Zeig mir Karte 6DOiJhV0`

---

## Setup: Claude Code CLI

### Schritt 1: Repo klonen und bauen

**Windows (PowerShell):**

```powershell
git clone https://github.com/skagital/trello-mcp-agital.git "$env:LOCALAPPDATA\agital\trello-mcp"
cd "$env:LOCALAPPDATA\agital\trello-mcp"
npm install
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\apply-shortlink-patch.ps1
npm run build
```

**macOS / Linux:**

```bash
git clone https://github.com/skagital/trello-mcp-agital.git ~/.local/share/agital/trello-mcp
cd ~/.local/share/agital/trello-mcp
npm install
npm run build
```

Prüfen ob der Build erfolgreich war:

```bash
# macOS/Linux
ls dist/index.js
```

```powershell
# Windows
Test-Path dist\index.js
```

### Schritt 2: MCP Server registrieren

Der Server wird im `user` Scope registriert. Das bedeutet: Er ist in **allen** Projekten verfügbar,
nicht nur im aktuellen Verzeichnis.

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

Hinweis: In PowerShell wird `` ` `` (Backtick) statt `\` (Backslash) für Zeilenumbrüche verwendet.

### Schritt 3: Verbindung prüfen

```bash
# Claude Code starten (alle Plattformen gleich)
claude

# Im Claude Code Prompt:
/mcp
# Sollte "trello-agital: connected" anzeigen
```

Oder direkt testen:

```
> Zeig mir meine Trello PBIs
```

### Hinweise zu den Scopes

| Scope | Wo gespeichert | Sichtbar für | Wann nutzen |
|---|---|---|---|
| `local` | `~/.claude.json` (projektspezifisch) | Nur du, nur dieses Projekt | Zum Experimentieren |
| `project` | `.mcp.json` im Repo | Alle die das Repo klonen | Geteilte Server ohne Credentials |
| `user` | `~/.claude.json` (global) | Nur du, alle Projekte | **Unser Standard: Trello mit persönlichen Credentials** |

Wir nutzen `user` Scope, weil:
- Der Trello-Zugriff projektübergreifend gebraucht wird
- Jeder seine eigenen Credentials hat
- Credentials nicht ins Repo gehören

---

## Board-Kontext-Datei einrichten

Die Datei `trello-board-context.md` enthält alle Listen-IDs, Label-IDs und Member-IDs
eures Boards. Sie wird wöchentlich automatisch aktualisiert (GitHub Action).

### Warum?

Ohne die Kontext-Datei muss Claude bei jedem PBI-Erstellen erst das gesamte Board abfragen,
um die richtige Listen-ID, Label-ID oder Member-ID zu finden. Das kostet 2-3 API-Calls
und viele Tokens. Mit der Kontext-Datei kennt Claude alle IDs sofort.

### Einrichten in Claude Code

Füge in die `CLAUDE.md` deines Projekts (oder erstelle eine) folgende Zeile ein:

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

Funktioniert auf allen Plattformen gleich:

1. Öffne dein Projekt in Claude Desktop
2. Gehe zu Project Knowledge
3. Lade die Datei `trello-board-context.md` aus dem Repo hoch

### Manuell aktualisieren

Falls sich Labels, Listen oder Team-Mitglieder geändert haben:

**macOS / Linux:**

```bash
cd ~/.local/share/agital/trello-mcp
TRELLO_API_KEY="dein-key" TRELLO_TOKEN="dein-token" bash scripts/generate-trello-context.sh
```

Benötigt `curl` und `jq` (auf macOS: `brew install jq`, auf Linux: `sudo apt install jq`).

**Windows:** Da das Generator-Script Bash benötigt, gibt es drei Optionen:

Option 1 (Git Bash):
```powershell
cd "$env:LOCALAPPDATA\agital\trello-mcp"
$env:TRELLO_API_KEY="dein-key"; $env:TRELLO_TOKEN="dein-token"
& "C:\Program Files\Git\bin\bash.exe" scripts/generate-trello-context.sh
```

Option 2 (WSL):
```powershell
wsl bash -c "cd ~/.local/share/agital/trello-mcp && TRELLO_API_KEY=dein-key TRELLO_TOKEN=dein-token bash scripts/generate-trello-context.sh"
```

Option 3 (Einfachste): Gar nicht lokal ausführen. Die GitHub Action aktualisiert
die Datei wöchentlich automatisch. Ein `git pull` reicht.

---

## Nutzung im Alltag

Die folgenden Beispiele funktionieren in Claude Desktop und Claude Code identisch,
auf allen Plattformen.

### Karte per URL abrufen

Kopiere einfach die Trello-URL aus dem Browser:

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

Claude kennt die IDs aus der Kontext-Datei und erstellt die Karte mit einem einzigen API-Call.

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

Übersicht aller verfügbaren MCP Tools:

| Tool | Beschreibung | Beispiel-Trigger |
|---|---|---|
| `get_card` | Karte per ID/shortLink/URL abrufen | "Zeig mir Karte X" |
| `create_card` | Neue Karte erstellen | "Erstelle ein PBI..." |
| `update_card` | Karte bearbeiten (Name, Beschreibung, Due Date, Labels) | "Ändere die Beschreibung von..." |
| `move_card` | Karte in andere Spalte verschieben | "Verschiebe Karte X nach Y" |
| `trello_add_comment` | Kommentar zu einer Karte hinzufügen | "Kommentiere auf Karte X..." |
| `trello_search` | Volltextsuche über alle Karten | "Suche nach..." |
| `trello_get_list_cards` | Alle Karten einer Spalte auflisten | "Was liegt in Working?" |
| `get_board_details` | Board-Struktur anzeigen | "Zeig mir das Board" |
| `get_lists` | Alle Spalten auflisten | "Welche Spalten gibt es?" |
| `trello_get_board_members` | Alle Board-Mitglieder anzeigen | "Wer ist im Board?" |
| `trello_get_board_labels` | Alle Labels anzeigen | "Welche Labels gibt es?" |
| `trello_get_board_cards` | Alle Karten des Boards | "Zeig mir alle offenen Karten" |
| `trello_get_card_actions` | Aktivitätsverlauf einer Karte | "Was ist auf Karte X passiert?" |
| `trello_get_card_attachments` | Anhänge einer Karte | "Welche Anhänge hat Karte X?" |
| `trello_get_card_checklists` | Checklisten einer Karte | "Zeig mir die Checkliste von X" |

---

## Troubleshooting

### "Server not found" / "trello-agital: disconnected"

Prüfe ob der Server gebaut ist:

```bash
# macOS/Linux
ls ~/.local/share/agital/trello-mcp/dist/index.js
```

```powershell
# Windows
Test-Path "$env:LOCALAPPDATA\agital\trello-mcp\dist\index.js"
# oder (wenn unter %APPDATA% installiert):
Test-Path "$env:APPDATA\Claude\mcp-servers\trello-mcp\dist\index.js"
```

Falls die Datei fehlt, nochmal bauen:

```bash
# macOS/Linux
cd ~/.local/share/agital/trello-mcp && npm install && npm run build
```

```powershell
# Windows
cd "$env:LOCALAPPDATA\agital\trello-mcp"; npm install; npm run build
```

### "Invalid API key" / "unauthorized"

Prüfe deine Credentials mit einem Schnelltest:

```bash
# macOS/Linux
curl -s "https://api.trello.com/1/boards/56a7e3b1ed97adbf2a2515d9?key=DEIN_KEY&token=DEIN_TOKEN&fields=name"
```

```powershell
# Windows
Invoke-RestMethod "https://api.trello.com/1/boards/56a7e3b1ed97adbf2a2515d9?key=DEIN_KEY&token=DEIN_TOKEN&fields=name"
```

Sollte `Product Backlog` als Board-Name zurückgeben. Falls nicht: Key/Token auf
https://trello.com/power-ups/admin erneuern.

### Claude Code: MCP Server wird nicht erkannt

```bash
# Registrierung prüfen (alle Plattformen)
claude mcp list
```

Falls nicht vorhanden, neu registrieren:

```bash
# macOS/Linux
claude mcp add trello-agital --scope user \
  -e TRELLO_API_KEY="DEIN_KEY" \
  -e TRELLO_TOKEN="DEIN_TOKEN" \
  -- node ~/.local/share/agital/trello-mcp/dist/index.js
```

```powershell
# Windows
claude mcp add trello-agital --scope user `
  -e TRELLO_API_KEY="DEIN_KEY" `
  -e TRELLO_TOKEN="DEIN_TOKEN" `
  -- node "$env:LOCALAPPDATA\agital\trello-mcp\dist\index.js"
```

### Claude Desktop: "Dieser Konnektor hat keine verfügbaren Tools"

Das deutet auf ein MCP-Protokoll-Mismatch hin. Server aktualisieren:

```bash
# macOS/Linux
cd ~/.local/share/agital/trello-mcp && git pull && npm install && npm run build
```

```powershell
# Windows
cd "$env:LOCALAPPDATA\agital\trello-mcp"; git pull; npm install; npm run build
```

Dann Claude Desktop komplett beenden (auch aus dem System Tray / der Menüleiste) und neu starten.

### Windows: ExecutionPolicy blockiert Scripts

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Das gilt nur für die aktuelle PowerShell-Session und ändert keine systemweiten Einstellungen.

### Windows: node.exe wird nicht gefunden

Falls `node` nicht im PATH liegt (z.B. bei nvm4w), finde den vollen Pfad:

```powershell
Get-Command node -ErrorAction SilentlyContinue | Select-Object Source
# oder
where.exe node
```

Diesen Pfad dann in der `claude_desktop_config.json` als `"command"` eintragen,
z.B. `"command": "C:\\nvm4w\\nodejs\\node.exe"`.

### macOS: Permission denied beim Ausführen von Scripts

```bash
chmod +x ~/.local/share/agital/trello-mcp/scripts/*.sh
```

### Linux: jq nicht installiert

Das Generator-Script benötigt `jq`:

```bash
# Debian/Ubuntu
sudo apt install jq

# Arch
sudo pacman -S jq

# Alpine
apk add jq
```

---

## Für Maintainer: Server aktualisieren

### Upstream-Änderungen übernehmen

Falls kocakli/Trello-Desktop-MCP relevante Updates bekommt:

```bash
cd ~/.local/share/agital/trello-mcp  # oder der Windows-Pfad

# Upstream als Remote hinzufügen (einmalig)
git remote add upstream https://github.com/kocakli/Trello-Desktop-MCP.git

# Änderungen holen
git fetch upstream

# Selektiv mergen oder cherry-picken
git diff upstream/main -- src/

# Nach dem Merge: Patch erneut anwenden
# macOS/Linux:
bash scripts/apply-shortlink-patch.sh

# Windows:
# .\scripts\apply-shortlink-patch.ps1

npm run build
```

### Board-Kontext manuell regenerieren

```bash
# macOS/Linux
cd ~/.local/share/agital/trello-mcp
TRELLO_API_KEY="key" TRELLO_TOKEN="token" bash scripts/generate-trello-context.sh
git add trello-board-context.md
git commit -m "chore: update board context"
git push
```

Auf Windows: Entweder über Git Bash ausführen oder einfach `git pull` nach dem
nächsten automatischen GitHub Action Run (jeden Montag 06:00 UTC).

### Neuen Release erstellen (.mcpb)

```bash
# Version in package.json und manifest.json hochzählen, dann:
git add -A
git commit -m "release: v1.1.0"
git tag v1.1.0
git push && git push --tags
# GitHub Action baut automatisch die .mcpb Datei
```

Die .mcpb Datei erscheint dann unter
[Releases](https://github.com/skagital/trello-mcp-agital/releases) auf GitHub.
Danach im Claude Team-Plan Extension-Verzeichnis hochladen (nur Admins/Owners).

---

## Kontakt

Bei Fragen oder Problemen: Sören Kann (@sk_esy)
