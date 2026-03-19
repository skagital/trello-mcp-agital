# Trello MCP Kontext

Dieses Repo enthält den agital Trello MCP Server mit shortLink-Support.

## Board-Referenz

Für Trello Board-Metadaten (Listen-IDs, Label-IDs, Member-IDs) siehe:
`trello-board-context.md` in diesem Repo.

Nutze diese IDs direkt bei MCP Tool-Calls. Kein vorheriges Board-Laden nötig.

## Karten referenzieren

Karten können auf drei Arten referenziert werden:
- Volle ID: `5abbe4b7ddc1b351ef961414` (24 Zeichen hex)
- shortLink: `6DOiJhV0` (8 Zeichen aus der URL)
- URL: `https://trello.com/c/6DOiJhV0/123-kartenname` (shortLink wird extrahiert)

## Meine PBIs finden

Nutze `trello_search` mit query `@me` und boardIds `["56a7e3b1ed97adbf2a2515d9"]`.
