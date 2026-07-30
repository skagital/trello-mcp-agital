import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TrelloClient } from '../trello/client.js';
import { extractErrorMessage } from '../utils/errors.js';
import {
  validateCreateChecklist,
  validateAddChecklistItem,
  validateUpdateChecklistItem,
  validateDeleteChecklistItem,
  validateDeleteChecklist
} from '../utils/validation.js';

// ── Create Checklist ───────────────────────────────────────────────

export const trelloCreateChecklistTool: Tool = {
  name: 'trello_create_checklist',
  description: 'Create a new checklist on a Trello card. Use this to add acceptance criteria, task lists, or checklists to cards.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      cardId: {
        type: 'string',
        description: 'ID of the card to add the checklist to',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      name: {
        type: 'string',
        description: 'Name of the checklist (e.g., "Akzeptanzkriterien", "Tasks")',
        minLength: 1
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'Position of the checklist: "top", "bottom", or a number'
      }
    },
    required: ['apiKey', 'token', 'cardId', 'name']
  }
};

export async function handleTrelloCreateChecklist(args: unknown) {
  try {
    const { apiKey, token, cardId, name, pos } = validateCreateChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.createChecklist(cardId, { name, pos });
    const checklist = response.data;

    const result = {
      summary: `Created checklist "${checklist.name}" on card`,
      checklist: {
        id: checklist.id,
        name: checklist.name,
        cardId: checklist.idCard,
        boardId: checklist.idBoard,
        position: checklist.pos,
        checkItems: checklist.checkItems || []
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error creating checklist: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Add Checklist Item ─────────────────────────────────────────────

export const trelloAddChecklistItemTool: Tool = {
  name: 'trello_add_checklist_item',
  description: 'Add an item to an existing checklist on a Trello card. Use this to add individual acceptance criteria or task items.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      checklistId: {
        type: 'string',
        description: 'ID of the checklist to add the item to',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      name: {
        type: 'string',
        description: 'Text of the checklist item (e.g., "z-Index der Tooltip-Box korrigiert")',
        minLength: 1
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'Position: "top", "bottom", or a number'
      },
      checked: {
        type: 'boolean',
        description: 'Whether the item should be checked/complete (default: false)'
      },
      due: {
        type: 'string',
        description: 'Due date in ISO 8601 format (optional)'
      },
      idMember: {
        type: 'string',
        description: 'Member ID to assign to this item (optional)',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'checklistId', 'name']
  }
};

export async function handleTrelloAddChecklistItem(args: unknown) {
  try {
    const { apiKey, token, checklistId, ...itemData } = validateAddChecklistItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.addChecklistItem(checklistId, itemData);
    const item = response.data;

    const result = {
      summary: `Added item "${item.name}" to checklist`,
      checkItem: {
        id: item.id,
        name: item.name,
        state: item.state,
        position: item.pos,
        due: item.due || null,
        idMember: item.idMember || null
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error adding checklist item: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Update Checklist Item ──────────────────────────────────────────

export const trelloUpdateChecklistItemTool: Tool = {
  name: 'trello_update_checklist_item',
  description: 'Update a checklist item on a Trello card. Use this to check/uncheck items, rename them, or change their due date.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      cardId: {
        type: 'string',
        description: 'ID of the card containing the checklist item',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      checkItemId: {
        type: 'string',
        description: 'ID of the checklist item to update',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      name: {
        type: 'string',
        description: 'New text for the checklist item'
      },
      state: {
        type: 'string',
        enum: ['complete', 'incomplete'],
        description: 'Set to "complete" to check the item, "incomplete" to uncheck'
      },
      pos: {
        oneOf: [
          { type: 'number', minimum: 0 },
          { type: 'string', enum: ['top', 'bottom'] }
        ],
        description: 'New position'
      },
      due: {
        type: 'string',
        description: 'Due date in ISO 8601 format'
      },
      idMember: {
        type: 'string',
        description: 'Member ID to assign (optional)',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'cardId', 'checkItemId']
  }
};

export async function handleTrelloUpdateChecklistItem(args: unknown) {
  try {
    const { apiKey, token, cardId, checkItemId, ...updateData } = validateUpdateChecklistItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.updateChecklistItem(cardId, checkItemId, updateData);
    const item = response.data;

    const result = {
      summary: `Updated checklist item "${item.name}" (${item.state})`,
      checkItem: {
        id: item.id,
        name: item.name,
        state: item.state,
        position: item.pos,
        due: item.due || null,
        idMember: item.idMember || null
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error updating checklist item: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Delete Checklist Item ──────────────────────────────────────────

export const trelloDeleteChecklistItemTool: Tool = {
  name: 'trello_delete_checklist_item',
  description: 'Delete a single item from a checklist on a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      checklistId: {
        type: 'string',
        description: 'ID of the checklist containing the item',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      checkItemId: {
        type: 'string',
        description: 'ID of the checklist item to delete',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'checklistId', 'checkItemId']
  }
};

export async function handleTrelloDeleteChecklistItem(args: unknown) {
  try {
    const { apiKey, token, checklistId, checkItemId } = validateDeleteChecklistItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteChecklistItem(checklistId, checkItemId);

    const result = {
      summary: `Deleted checklist item ${checkItemId} from checklist ${checklistId}`,
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error deleting checklist item: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Delete Checklist ───────────────────────────────────────────────

export const trelloDeleteChecklistTool: Tool = {
  name: 'trello_delete_checklist',
  description: 'Delete an entire checklist from a Trello card.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      checklistId: {
        type: 'string',
        description: 'ID of the checklist to delete',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export async function handleTrelloDeleteChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId } = validateDeleteChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteChecklist(checklistId);

    const result = {
      summary: `Deleted checklist ${checklistId}`,
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error deleting checklist: ${errorMessage}` }],
      isError: true
    };
  }
}
