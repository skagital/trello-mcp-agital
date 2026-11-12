import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import type { TrelloCard } from '../types/trello.js';
import { extractErrorMessage } from '../utils/errors.js';

/*
 * Epics über das Power-Up Hello Epics.
 *
 * Hello Epics speichert ein Child als Karten-Link-Anhang am Epic (URL https://trello.com/c/<Karten-ID>).
 * Die Child-Karte selbst trägt keinen Rückverweis. Jeder Karten-Link-Anhang an einer Karte gilt für
 * Hello Epics als Child. Gemessen am 12.11.2026: ein per API gesetzter Anhang erscheint sofort in der
 * Children-Liste des Power-Ups.
 */

const DEFAULT_BOARD_ID = '56a7e3b1ed97adbf2a2515d9';
const LIST_IN_VORBEREITUNG = '652d14fee05c5d3cabf43f57';
const CARD_LINK_PATTERN = /^https?:\/\/trello\.com\/c\/([A-Za-z0-9]+)/;

const credentials = {
  apiKey: z.string().min(1, 'API key is required'),
  token: z.string().min(1, 'Token is required')
};
const cardRef = z.string().min(1, 'Card reference must not be empty');

const credentialProps = {
  apiKey: {
    type: 'string',
    description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
  },
  token: {
    type: 'string',
    description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
  }
};

const cardRefDescription = 'Karten-ID (24 Zeichen), shortLink (8 Zeichen) oder Karten-URL';

/** Macht aus ID, shortLink oder URL eine Referenz, die die Trello-API annimmt. */
function normalizeCardRef(ref: string): string {
  const match = ref.trim().match(CARD_LINK_PATTERN);
  return match ? match[1] : ref.trim();
}

/** Liefert die Karten-Referenz aus einem Anhang, wenn er auf eine Trello-Karte zeigt. */
function linkedCardRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(CARD_LINK_PATTERN);
  return match ? match[1] : null;
}

function refersTo(ref: string, card: { id: string; shortLink?: string }): boolean {
  return ref === card.id || (card.shortLink !== undefined && ref === card.shortLink);
}

async function listNames(client: TrelloClient, boardId: string): Promise<Map<string, string>> {
  const response = await client.getBoardLists(boardId, 'all');
  return new Map(response.data.map(list => [list.id, list.name]));
}

function textResult(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

function errorResult(prefix: string, error: unknown) {
  return {
    content: [{ type: 'text' as const, text: `${prefix}: ${extractErrorMessage(error)}` }],
    isError: true
  };
}

interface EpicChild {
  attachmentId: string;
  card: TrelloCard | null;
  ref: string;
}

async function loadChildren(client: TrelloClient, epicId: string): Promise<EpicChild[]> {
  const attachments = (await client.getCardAttachments(epicId, { fields: ['id', 'name', 'url'] })).data;
  const children: EpicChild[] = [];
  for (const attachment of attachments) {
    const ref = linkedCardRef(attachment.url);
    if (!ref) continue;
    try {
      const card = (await client.getCard(ref)).data;
      children.push({ attachmentId: attachment.id, card, ref });
    } catch {
      // Gelöschte oder unzugängliche Karte: Anhang bleibt sichtbar, damit er sich entfernen lässt.
      children.push({ attachmentId: attachment.id, card: null, ref });
    }
  }
  return children;
}

// ── Children eines Epics ───────────────────────────────────────────

export const trelloGetEpicChildrenTool: Tool = {
  name: 'trello_get_epic_children',
  description: 'Liest ein Epic (Hello Epics) mit allen Child-Karten und deren Spalte. Hello Epics führt Children als Karten-Link-Anhänge am Epic.',
  inputSchema: {
    type: 'object',
    properties: {
      ...credentialProps,
      epicCardId: { type: 'string', description: `Epic-Karte: ${cardRefDescription}` }
    },
    required: ['apiKey', 'token', 'epicCardId']
  }
};

const getEpicChildrenSchema = z.object({ ...credentials, epicCardId: cardRef });

export async function handleTrelloGetEpicChildren(args: unknown) {
  try {
    const { apiKey, token, epicCardId } = getEpicChildrenSchema.parse(args);
    const client = new TrelloClient({ apiKey, token });
    const epic = (await client.getCard(normalizeCardRef(epicCardId))).data;
    const names = await listNames(client, epic.idBoard);
    const children = await loadChildren(client, epic.id);

    const perList: Record<string, number> = {};
    for (const child of children) {
      const listName = child.card ? names.get(child.card.idList) ?? child.card.idList : 'Karte nicht lesbar';
      perList[listName] = (perList[listName] ?? 0) + 1;
    }

    return textResult({
      summary: `Epic "${epic.name}" mit ${children.length} Child-Karte(n)`,
      epic: {
        id: epic.id,
        name: epic.name,
        url: epic.shortUrl,
        list: names.get(epic.idList) ?? epic.idList,
        listId: epic.idList,
        description: epic.desc || ''
      },
      childrenPerList: perList,
      children: children.map(child => child.card
        ? {
            id: child.card.id,
            name: child.card.name,
            url: child.card.shortUrl,
            list: names.get(child.card.idList) ?? child.card.idList,
            listId: child.card.idList,
            closed: child.card.closed,
            attachmentId: child.attachmentId
          }
        : { ref: child.ref, error: 'Karte nicht lesbar oder gelöscht', attachmentId: child.attachmentId })
    });
  } catch (error) {
    return errorResult('Error reading epic', error);
  }
}

// ── Epic einer Karte finden ────────────────────────────────────────

export const trelloFindEpicTool: Tool = {
  name: 'trello_find_epic',
  description: 'Findet das Epic (Hello Epics), unter dem eine Karte als Child hängt, und liefert dessen Beschreibung mit dem Ziel des Projekts. Durchsucht die offenen Karten des Boards nach Karten-Link-Anhängen.',
  inputSchema: {
    type: 'object',
    properties: {
      ...credentialProps,
      cardId: { type: 'string', description: `Child-Karte: ${cardRefDescription}` },
      boardId: { type: 'string', description: `Board-ID, Standard Product Backlog (${DEFAULT_BOARD_ID})` }
    },
    required: ['apiKey', 'token', 'cardId']
  }
};

const findEpicSchema = z.object({ ...credentials, cardId: cardRef, boardId: z.string().min(1).optional() });

export async function handleTrelloFindEpic(args: unknown) {
  try {
    const { apiKey, token, cardId, boardId } = findEpicSchema.parse(args);
    const client = new TrelloClient({ apiKey, token });
    const card = (await client.getCard(normalizeCardRef(cardId))).data;
    const board = boardId ?? card.idBoard ?? DEFAULT_BOARD_ID;
    const cards = (await client.getBoardCardsWithAttachmentUrls(board)).data;
    const names = await listNames(client, board);

    const parents = cards.filter(candidate =>
      candidate.id !== card.id &&
      (candidate.attachments ?? []).some(attachment => {
        const ref = linkedCardRef(attachment.url);
        return ref !== null && refersTo(ref, card);
      })
    );

    const epics = [];
    for (const parent of parents) {
      const full = (await client.getCard(parent.id)).data;
      epics.push({
        id: full.id,
        name: full.name,
        url: full.shortUrl,
        list: names.get(full.idList) ?? full.idList,
        description: full.desc || ''
      });
    }

    return textResult({
      summary: epics.length === 0
        ? `"${card.name}" hängt unter keinem Epic`
        : `"${card.name}" hängt unter ${epics.map(epic => `"${epic.name}"`).join(', ')}`,
      card: { id: card.id, name: card.name, url: card.shortUrl },
      epics
    });
  } catch (error) {
    return errorResult('Error finding epic', error);
  }
}

// ── Children zuordnen ──────────────────────────────────────────────

export const trelloAddEpicChildrenTool: Tool = {
  name: 'trello_add_epic_children',
  description: 'Hängt eine oder mehrere Karten als Children unter ein Epic (Hello Epics), als Karten-Link-Anhang am Epic. Bereits zugeordnete Karten werden übersprungen.',
  inputSchema: {
    type: 'object',
    properties: {
      ...credentialProps,
      epicCardId: { type: 'string', description: `Epic-Karte: ${cardRefDescription}` },
      childCardIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: `Child-Karten, je ${cardRefDescription}`
      }
    },
    required: ['apiKey', 'token', 'epicCardId', 'childCardIds']
  }
};

const addEpicChildrenSchema = z.object({
  ...credentials,
  epicCardId: cardRef,
  childCardIds: z.array(cardRef).min(1, 'At least one child card is required')
});

export async function handleTrelloAddEpicChildren(args: unknown) {
  try {
    const { apiKey, token, epicCardId, childCardIds } = addEpicChildrenSchema.parse(args);
    const client = new TrelloClient({ apiKey, token });
    const epic = (await client.getCard(normalizeCardRef(epicCardId))).data;
    const existing = (await client.getCardAttachments(epic.id, { fields: ['url'] })).data
      .map(attachment => linkedCardRef(attachment.url))
      .filter((ref): ref is string => ref !== null);

    const added: Array<{ id: string; name: string; url: string }> = [];
    const skipped: Array<{ ref: string; reason: string }> = [];

    for (const childRef of childCardIds) {
      try {
        const child = (await client.getCard(normalizeCardRef(childRef))).data;
        if (child.id === epic.id) {
          skipped.push({ ref: childRef, reason: 'ist das Epic selbst' });
          continue;
        }
        if (existing.some(ref => refersTo(ref, child))) {
          skipped.push({ ref: childRef, reason: `"${child.name}" hängt schon unter dem Epic` });
          continue;
        }
        await client.addAttachmentUrl(epic.id, { url: `https://trello.com/c/${child.id}`, name: child.name });
        existing.push(child.id);
        added.push({ id: child.id, name: child.name, url: child.shortUrl });
      } catch (error) {
        skipped.push({ ref: childRef, reason: extractErrorMessage(error) });
      }
    }

    return textResult({
      summary: `${added.length} Karte(n) unter "${epic.name}" gehängt, ${skipped.length} übersprungen`,
      epic: { id: epic.id, name: epic.name, url: epic.shortUrl },
      added,
      skipped
    });
  } catch (error) {
    return errorResult('Error adding epic children', error);
  }
}

// ── Child lösen ────────────────────────────────────────────────────

export const trelloRemoveEpicChildTool: Tool = {
  name: 'trello_remove_epic_child',
  description: 'Löst eine Child-Karte von einem Epic (Hello Epics), indem der Karten-Link-Anhang am Epic entfernt wird. Die Child-Karte selbst bleibt unverändert.',
  inputSchema: {
    type: 'object',
    properties: {
      ...credentialProps,
      epicCardId: { type: 'string', description: `Epic-Karte: ${cardRefDescription}` },
      childCardId: { type: 'string', description: `Child-Karte: ${cardRefDescription}` }
    },
    required: ['apiKey', 'token', 'epicCardId', 'childCardId']
  }
};

const removeEpicChildSchema = z.object({ ...credentials, epicCardId: cardRef, childCardId: cardRef });

export async function handleTrelloRemoveEpicChild(args: unknown) {
  try {
    const { apiKey, token, epicCardId, childCardId } = removeEpicChildSchema.parse(args);
    const client = new TrelloClient({ apiKey, token });
    const epic = (await client.getCard(normalizeCardRef(epicCardId))).data;
    const childRef = normalizeCardRef(childCardId);

    let child: { id: string; shortLink?: string; name?: string } = { id: childRef };
    try {
      const card = (await client.getCard(childRef)).data;
      child = { id: card.id, shortLink: card.shortLink, name: card.name };
    } catch {
      // Gelöschte Karte: über die Referenz aus dem Aufruf abgleichen.
    }

    const attachments = (await client.getCardAttachments(epic.id, { fields: ['id', 'url'] })).data;
    const matches = attachments.filter(attachment => {
      const ref = linkedCardRef(attachment.url);
      return ref !== null && (refersTo(ref, child) || ref === childRef);
    });

    for (const attachment of matches) {
      await client.deleteAttachment(epic.id, attachment.id);
    }

    return textResult({
      summary: matches.length === 0
        ? `"${child.name ?? childRef}" hängt nicht unter "${epic.name}"`
        : `"${child.name ?? childRef}" von "${epic.name}" gelöst`,
      removedAttachments: matches.map(attachment => attachment.id)
    });
  } catch (error) {
    return errorResult('Error removing epic child', error);
  }
}

// ── Epic mit Children verschieben ──────────────────────────────────

export const trelloMoveEpicTool: Tool = {
  name: 'trello_move_epic',
  description: 'Verschiebt ein Epic (Hello Epics) in eine Spalte und nimmt alle Children mit, die in den Quellspalten liegen (Standard: "In Vorbereitung"). Children in anderen Spalten bleiben, wo sie sind. Mit dryRun nur der Plan, ohne Änderung.',
  inputSchema: {
    type: 'object',
    properties: {
      ...credentialProps,
      epicCardId: { type: 'string', description: `Epic-Karte: ${cardRefDescription}` },
      targetListId: { type: 'string', description: 'Zielspalte für Epic und Children' },
      childrenFromListIds: {
        type: 'array',
        items: { type: 'string' },
        description: `Spalten, aus denen Children mitwandern. Standard: In Vorbereitung (${LIST_IN_VORBEREITUNG})`
      },
      epicPos: {
        description: 'Position des Epics in der Zielspalte: "top", "bottom" oder Zahl. Standard "bottom"',
        oneOf: [{ type: 'string', enum: ['top', 'bottom'] }, { type: 'number' }]
      },
      dryRun: { type: 'boolean', description: 'Nur den Plan zeigen, nichts verschieben. Standard false' }
    },
    required: ['apiKey', 'token', 'epicCardId', 'targetListId']
  }
};

const moveEpicSchema = z.object({
  ...credentials,
  epicCardId: cardRef,
  targetListId: z.string().min(1),
  childrenFromListIds: z.array(z.string().min(1)).optional(),
  epicPos: z.union([z.number().min(0), z.enum(['top', 'bottom'])]).optional(),
  dryRun: z.boolean().optional().default(false)
});

export async function handleTrelloMoveEpic(args: unknown) {
  try {
    const { apiKey, token, epicCardId, targetListId, childrenFromListIds, epicPos, dryRun } = moveEpicSchema.parse(args);
    const client = new TrelloClient({ apiKey, token });
    const epic = (await client.getCard(normalizeCardRef(epicCardId))).data;
    const names = await listNames(client, epic.idBoard);
    if (!names.has(targetListId)) {
      throw new Error(`Spalte ${targetListId} gibt es auf dem Board des Epics nicht`);
    }

    const sourceLists = childrenFromListIds ?? [LIST_IN_VORBEREITUNG];
    const children = (await loadChildren(client, epic.id))
      .map(child => child.card)
      .filter((card): card is TrelloCard => card !== null && !card.closed);

    const toMove = children
      .filter(card => sourceLists.includes(card.idList) && card.idList !== targetListId)
      .sort((a, b) => a.pos - b.pos);
    const staying = children.filter(card => !toMove.includes(card));

    const describe = (card: TrelloCard) => ({
      id: card.id,
      name: card.name,
      url: card.shortUrl,
      list: names.get(card.idList) ?? card.idList
    });

    const plan = {
      epic: { ...describe(epic), to: names.get(targetListId) },
      childrenMoving: toMove.map(describe),
      childrenStaying: staying.map(describe)
    };

    if (dryRun) {
      return textResult({
        summary: `Plan: "${epic.name}" und ${toMove.length} Child-Karte(n) nach "${names.get(targetListId)}", ${staying.length} bleiben`,
        dryRun: true,
        ...plan
      });
    }

    if (epic.idList !== targetListId) {
      await client.moveCard(epic.id, { idList: targetListId, pos: epicPos ?? 'bottom' });
    }
    const moved: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    for (const card of toMove) {
      try {
        await client.moveCard(card.id, { idList: targetListId, pos: 'bottom' });
        moved.push(card.name);
      } catch (error) {
        failed.push({ name: card.name, error: extractErrorMessage(error) });
      }
    }

    return textResult({
      summary: `"${epic.name}" und ${moved.length} Child-Karte(n) nach "${names.get(targetListId)}" verschoben${failed.length ? `, ${failed.length} fehlgeschlagen` : ''}`,
      ...plan,
      failed
    });
  } catch (error) {
    return errorResult('Error moving epic', error);
  }
}
