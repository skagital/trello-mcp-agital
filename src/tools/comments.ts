import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import {
  validateUpdateComment,
  validateDeleteComment,
  formatValidationError
} from '../utils/validation.js';

const commentIdProperties = {
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
    description: 'ID of the card the comment belongs to',
    pattern: '^[a-zA-Z0-9]{1,24}$'
  },
  commentId: {
    type: 'string',
    description: 'ID of the comment. Get it from trello_get_card_actions with filter "commentCard" - it is the action id, not the card id.',
    pattern: '^[a-zA-Z0-9]{1,24}$'
  }
} as const;

// The Trello client rejects with a plain object ({ message, status, code }), not an Error
// instance, so an `instanceof Error` check alone would swallow every HTTP failure.
function extractErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return formatValidationError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; status?: unknown; code?: unknown };
    if (typeof candidate.message === 'string') {
      const status = typeof candidate.status === 'number' ? ` (HTTP ${candidate.status})` : '';
      const code = typeof candidate.code === 'string' ? ` [${candidate.code}]` : '';
      return `${candidate.message}${status}${code}`;
    }
    return JSON.stringify(error);
  }
  return 'Unknown error occurred';
}

function errorResult(action: string, error: unknown) {
  const errorMessage = extractErrorMessage(error);

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

export const trelloUpdateCommentTool: Tool = {
  name: 'trello_update_comment',
  description: 'Replace the text of an existing comment on a Trello card. The full text is overwritten, there is no partial edit - pass the complete new text. Only comments written by the authenticated user can be edited. Get the comment id from trello_get_card_actions with filter "commentCard".',
  inputSchema: {
    type: 'object',
    properties: {
      ...commentIdProperties,
      text: {
        type: 'string',
        description: 'The complete new text of the comment. Replaces the previous text entirely.',
        minLength: 1
      }
    },
    required: ['apiKey', 'token', 'cardId', 'commentId', 'text']
  }
};

export async function handleTrelloUpdateComment(args: unknown) {
  try {
    const { apiKey, token, cardId, commentId, text } = validateUpdateComment(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.updateCardComment(cardId, commentId, text);
    const comment = response.data;

    const result = {
      summary: `Updated comment ${commentId} on card ${cardId}`,
      comment: {
        id: comment?.id,
        date: comment?.date,
        text: comment?.data?.text,
        memberCreator: comment?.memberCreator
          ? {
              id: comment.memberCreator.id,
              fullName: comment.memberCreator.fullName,
              username: comment.memberCreator.username
            }
          : null
      },
      rateLimit: response.rateLimit
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
    return errorResult('updating comment', error);
  }
}

export const trelloDeleteCommentTool: Tool = {
  name: 'trello_delete_comment',
  description: 'Delete a comment from a Trello card. This is irreversible - the comment text is gone and cannot be restored, so confirm with the user before calling it. Only comments written by the authenticated user can be deleted (board admins can delete any). Get the comment id from trello_get_card_actions with filter "commentCard".',
  inputSchema: {
    type: 'object',
    properties: commentIdProperties,
    required: ['apiKey', 'token', 'cardId', 'commentId']
  }
};

export async function handleTrelloDeleteComment(args: unknown) {
  try {
    const { apiKey, token, cardId, commentId } = validateDeleteComment(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteCardComment(cardId, commentId);

    const result = {
      summary: `Deleted comment ${commentId} from card ${cardId}`,
      cardId,
      commentId,
      rateLimit: response.rateLimit
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
    return errorResult('deleting comment', error);
  }
}
