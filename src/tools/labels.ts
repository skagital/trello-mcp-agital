import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import {
  validateAddCardLabel,
  validateRemoveCardLabel,
  formatValidationError
} from '../utils/validation.js';

const labelIdProperties = {
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
    description: 'ID of the card (you can get this from board details or searches)',
    pattern: '^[a-zA-Z0-9]{1,24}$'
  },
  labelId: {
    type: 'string',
    description: 'ID of the label to add/remove (get it from trello_get_board_labels)',
    pattern: '^[a-zA-Z0-9]{1,24}$'
  }
} as const;

function mapLabels(labels: { id: string; name: string; color: string }[] | undefined) {
  return (labels || []).map(label => ({ id: label.id, name: label.name, color: label.color }));
}

function errorResult(action: string, error: unknown) {
  const errorMessage = error instanceof z.ZodError
    ? formatValidationError(error)
    : error instanceof Error
      ? error.message
      : 'Unknown error occurred';

  return {
    content: [
      {
        type: 'text' as const,
        text: `Error ${action}: ${errorMessage}`
      }
    ],
    isError: true
  };
}

export const trelloAddCardLabelTool: Tool = {
  name: 'trello_add_card_label',
  description: 'Add a single label to an existing card WITHOUT removing the card\'s other labels (additive). Idempotent: doing it again when the label is already present is a no-op. Use trello_get_board_labels to find label IDs.',
  inputSchema: {
    type: 'object',
    properties: labelIdProperties,
    required: ['apiKey', 'token', 'cardId', 'labelId']
  }
};

export async function handleTrelloAddCardLabel(args: unknown) {
  try {
    const { apiKey, token, cardId, labelId } = validateAddCardLabel(args);
    const client = new TrelloClient({ apiKey, token });

    // Read current labels to keep the operation idempotent and non-destructive.
    const before = await client.getCard(cardId, true);
    const alreadyPresent = (before.data.labels || []).some(label => label.id === labelId);

    if (!alreadyPresent) {
      await client.addCardLabel(cardId, labelId);
    }

    const after = alreadyPresent ? before : await client.getCard(cardId, true);

    const result = {
      summary: alreadyPresent
        ? `Label ${labelId} was already on card "${after.data.name}" – no change`
        : `Added label ${labelId} to card "${after.data.name}"`,
      cardId,
      labelId,
      alreadyPresent,
      labels: mapLabels(after.data.labels),
      rateLimit: after.rateLimit
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return errorResult('adding label to card', error);
  }
}

export const trelloRemoveCardLabelTool: Tool = {
  name: 'trello_remove_card_label',
  description: 'Remove a single label from an existing card WITHOUT touching the card\'s other labels (subtractive). Idempotent: removing a label that is not present is a no-op. Use trello_get_board_labels to find label IDs.',
  inputSchema: {
    type: 'object',
    properties: labelIdProperties,
    required: ['apiKey', 'token', 'cardId', 'labelId']
  }
};

export async function handleTrelloRemoveCardLabel(args: unknown) {
  try {
    const { apiKey, token, cardId, labelId } = validateRemoveCardLabel(args);
    const client = new TrelloClient({ apiKey, token });

    await client.removeCardLabel(cardId, labelId);

    // Re-read so the caller sees the resulting label set.
    const after = await client.getCard(cardId, true);

    const result = {
      summary: `Removed label ${labelId} from card "${after.data.name}"`,
      cardId,
      labelId,
      labels: mapLabels(after.data.labels),
      rateLimit: after.rateLimit
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return errorResult('removing label from card', error);
  }
}
