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

## Epics (Hello Epics)

Das Board nutzt das Power-Up Hello Epics. Ein Child ist ein Karten-Link-Anhang am Epic (`https://trello.com/c/<Karten-ID>`), die Child-Karte trägt keinen Rückverweis. Jeder Karten-Link-Anhang gilt für Hello Epics als Child, deshalb Querverweise zwischen Karten nie als Anhang setzen, nur als Link im Text.

- `trello_get_epic_children`: Epic mit Ziel und allen Children samt Spalte
- `trello_find_epic`: Epic einer Karte finden (durchsucht die offenen Board-Karten)
- `trello_add_epic_children` / `trello_remove_epic_child`: Zuordnung setzen oder lösen
- `trello_move_epic`: Epic in eine Spalte schieben, Children aus „In Vorbereitung“ wandern mit; erst mit `dryRun: true` zeigen

## Meine PBIs finden

Nutze `trello_search` mit query `@me` und boardIds `["56a7e3b1ed97adbf2a2515d9"]`.
