# MCP Server Entwicklung: Lessons Learned

Dokumentation der Probleme und Lösungen bei der Entwicklung des agital Trello MCP Servers.
Dieses Dokument dient als Referenz für zukünftige MCP-Server-Entwicklungen.

Erstellt am: 19.03.2026
Projekt: trello-mcp-agital

---

## 1. Protokoll-Negotiation: Kein manueller Initialize Handler

**Problem:** Der kocakli Upstream-Server hatte einen manuellen `server.setRequestHandler(InitializeRequestSchema, ...)` Handler, der die `protocolVersion` hardcoded auf `2024-11-05` setzte. Claude Desktop sendet aber `2025-11-25` und erwartet eine kompatible Antwort. Der Server crashed sofort nach dem `initialize` Call.

**Lösung:** Den manuellen Initialize Handler komplett entfernen. Das MCP SDK (ab Version 1.24.0) handled die Protokoll-Negotiation automatisch. Desktop Commander (eine funktionierende Extension) macht es genauso: kein manueller Initialize Handler, das SDK übernimmt.

**Regel:** Niemals die Protokollversion manuell in einem Request Handler setzen. Das SDK regelt das. Auch `ListResourcesRequestSchema` und `ListPromptsRequestSchema` Handler sind unnötig wenn man keine Resources/Prompts anbietet.

---

## 2. MCP SDK Version: Mindestens 1.24.0 verwenden

**Problem:** Die `package.json` hatte `"@modelcontextprotocol/sdk": "^1.0.0"`, was auf dem GitHub Action Runner eine ältere Version auflösen konnte, die `protocolVersion: 2025-11-25` nicht kennt.

**Lösung:** SDK-Version explizit auf mindestens `^1.27.1` pinnen. In der `package.json`:
```json
"@modelcontextprotocol/sdk": "^1.27.1"
```

**Regel:** Immer die neueste SDK-Version verwenden und explizit pinnen. Nicht auf `^1.0.0` Range verlassen.

---

## 3. MCPB Manifest: Version 0.3, `${__dirname}` in args

**Problem:** Manifest mit `manifest_version: "0.2"` und ohne `${__dirname}` funktionierte nicht. Desktop Commander nutzt `"0.3"` und `${__dirname}`.

**Lösung:** Manifest-Vorlage für funktionierende Extensions:
```json
{
  "manifest_version": "0.3",
  "server": {
    "type": "node",
    "entry_point": "dist/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/index.js"],
      "env": {
        "MY_VAR": "${user_config.my_var}"
      }
    }
  },
  "user_config": {
    "my_var": {
      "type": "string",
      "title": "My Variable",
      "description": "Beschreibung",
      "required": true,
      "sensitive": true
    }
  }
}
```

**Regel:** Immer `manifest_version: "0.3"` verwenden. Immer `${__dirname}` in den args nutzen. Das Feld heißt `title` (nicht `label`). Das Feld heißt `manifest_version` (nicht `mcpb_version`).

---

## 4. ESM vs CommonJS: ESM funktioniert

**Problem:** Wir haben unnötig von ESM auf CommonJS umgestellt, weil wir vermuteten, dass Claude Desktops eingebautes Node.js kein ESM unterstützt.

**Lösung:** ESM funktioniert einwandfrei. Desktop Commander nutzt ESM (`import` Statements). Die `package.json` braucht `"type": "module"`, die `tsconfig.json` braucht `"module": "ESNext"`.

**Regel:** ESM beibehalten. CommonJS-Umstellung ist unnötig und war eine Sackgasse.

---

## 5. Validierungen: Alle Dateien patchen, nicht nur eine

**Problem:** Der shortLink-Patch wurde nur auf `src/utils/validation.ts` angewendet, aber `src/tools/advanced.ts`, `boards.ts`, `cards.ts`, `lists.ts` und `search.ts` hatten eigene inline Zod-Regex Validierungen und JSON-Schema Patterns, die ebenfalls das alte `^[a-f0-9]{24}$` Pattern verwendeten.

**Lösung:** Alle Dateien mit `grep`/`Select-String` durchsuchen und alle Vorkommen ersetzen:
- Zod-Regex: `z.string().regex(/^[a-f0-9]{24}$/...)` ersetzen durch `z.string().min(1, '...')`
- JSON-Schema Pattern: `'^[a-f0-9]{24}$'` ersetzen durch `'^[a-zA-Z0-9]{1,24}$'`

**Regel:** Vor dem Build immer prüfen:
```bash
grep -r "a-f0-9" src/
```
Muss leer sein. Wenn nicht, sind noch ungepatchte Stellen vorhanden.

---

## 6. PowerShell Encoding: UTF-8 ohne BOM

**Problem:** PowerShells `Set-Content -Encoding UTF8` schreibt ein Byte Order Mark (BOM, `﻿`) an den Dateianfang, das JSON-Parser zum Crashen bringt ("Unexpected token '﻿'").

**Lösung:** Statt `Set-Content` immer `[System.IO.File]::WriteAllText()` mit explizitem UTF-8-ohne-BOM Encoding verwenden:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

**Regel:** Auf Windows niemals `Set-Content -Encoding UTF8` für JSON-Dateien verwenden. Oder einfach Notepad/VS Code nutzen.

---

## 7. PowerShell Regex: Here-Strings und Sonderzeichen

**Problem:** PowerShells `-replace` Operator hat Probleme mit komplexen Regex-Patterns, die Sonderzeichen wie Klammern, Backslashes und Punkte enthalten (typisch für Zod-Regex-Strings). Patterns werden nicht gefunden oder falsch ersetzt.

**Lösung:** Für komplexe Ersetzungen in Source-Dateien nicht PowerShell-Regex verwenden, sondern:
- Notepad oder VS Code für manuelle Edits
- Oder Claude Code mit einem klaren Prompt
- PowerShells Here-Strings (`@'...'@`) können Anführungszeichen in TypeScript/JavaScript-Code korrumpieren

**Regel:** PowerShell-Regex nur für einfache Ersetzungen (z.B. Versionsnummern) verwenden. Für Code-Edits Notepad, VS Code oder Claude Code nutzen.

---

## 8. MCPB Debugging: stderr wird nicht geloggt

**Problem:** Claude Desktop zeigt `console.error()` Ausgaben von MCPB Extensions nicht in den Logs. Wir konnten nicht debuggen warum der Server crashed, weil keine Fehlermeldungen sichtbar waren.

**Lösung:** Debug-Informationen in eine Datei schreiben statt auf stderr:
```javascript
const fs = require("fs");
fs.writeFileSync("C:\\Users\\...\\debug.log", "message\n");
```
Aber: Auch das funktionierte nicht zuverlässig, weil Claude Desktop die Extension möglicherweise in einer Sandbox ausführt.

**Effektivste Debug-Methode:** Eine funktionierende Extension (z.B. Desktop Commander) als Referenz nehmen und die eigene Extension Schritt für Schritt an deren Pattern angleichen. Vergleich der `manifest.json`, `package.json`, `dist/index.js` Struktur.

**Regel:** Bei MCPB-Problemen nicht blind debuggen, sondern eine funktionierende Extension als Referenz-Implementation analysieren.

---

## 9. Extension Installation: Immer deinstallieren vor Neuinstallation

**Problem:** Claude Desktop cached installierte Extensions. Änderungen an der `.mcpb`-Datei oder am Dateisystem der installierten Extension werden nicht immer übernommen.

**Lösung:** Bei jedem Test-Zyklus:
1. Extension in Claude Desktop deinstallieren
2. Claude Desktop komplett schließen (auch System Tray)
3. Prüfen ob der Ordner unter `%APPDATA%\Claude\Claude Extensions\` gelöscht wurde
4. Claude Desktop starten
5. Neue `.mcpb` installieren

**Regel:** Niemals eine Extension "über" eine bestehende installieren. Immer erst deinstallieren.

---

## 10. Trello API: shortLink funktioniert als cardId

**Problem:** Der MCP-Server akzeptierte nur 24-Zeichen Hex-IDs für Karten, obwohl die Trello API auch den 8-Zeichen shortLink akzeptiert (der in der URL steht: `trello.com/c/SHORTLINK/...`).

**Lösung:** Alle Validierungen lockern:
- Zod: `z.string().min(1)` statt `z.string().regex(/^[a-f0-9]{24}$/)`
- JSON-Schema: `pattern: '^[a-zA-Z0-9]{1,24}$'` statt `pattern: '^[a-f0-9]{24}$'`

**Regel:** Die Trello API ist toleranter als der MCP-Server. Validierungen so locker wie möglich halten und der API die Fehlermeldung überlassen.

---

## Zusammenfassung: Checkliste für neue MCP Server

Vor dem ersten Build:
- [ ] MCP SDK Version >= 1.27.1 in package.json gepinnt
- [ ] Kein manueller Initialize Handler im Server-Code
- [ ] `"type": "module"` in package.json (ESM)
- [ ] `tsconfig.json` mit `"module": "ESNext"`

Vor dem MCPB-Packaging:
- [ ] `manifest_version: "0.3"` in manifest.json
- [ ] `${__dirname}` in mcp_config.args
- [ ] `title` (nicht `label`) in user_config Feldern
- [ ] Alle Dateien UTF-8 ohne BOM
- [ ] Keine `console.log` auf stdout (nur `console.error` erlaubt)

Vor dem Release:
- [ ] `grep -r "problematische-patterns" src/` zeigt keine Treffer
- [ ] Build läuft sauber durch
- [ ] Manueller Test über `claude_desktop_config.json` funktioniert
- [ ] Extension deinstallieren, neu installieren, testen

Debugging-Reihenfolge:
1. Funktioniert der Server manuell über die Config? Wenn nein: Server-Code Problem
2. Funktioniert die Extension? Wenn nein: Packaging/Manifest Problem
3. Vergleich mit funktionierender Extension (z.B. Desktop Commander)
4. Installationsordner prüfen: `%APPDATA%\Claude\Claude Extensions\`
