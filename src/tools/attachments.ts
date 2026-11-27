import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { TrelloClient } from '../trello/client.js';
import { extractErrorMessage } from '../utils/errors.js';
import {
  validateAddAttachmentUrl,
  validateAddAttachmentFile,
  validateDeleteAttachment,
  validateDownloadAttachment
} from '../utils/validation.js';

// ── Add Attachment (URL) ───────────────────────────────────────────

export const trelloAddAttachmentUrlTool: Tool = {
  name: 'trello_add_attachment_url',
  description: 'Add a URL as an attachment to a Trello card. Use this to link designs, documents, or external resources.',
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
        description: 'ID of the card to attach the URL to',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      url: {
        type: 'string',
        format: 'uri',
        description: 'The URL to attach (e.g., a Figma link, Google Doc, or image URL)'
      },
      name: {
        type: 'string',
        description: 'Display name for the attachment (optional, defaults to URL)',
        maxLength: 256
      },
      setCover: {
        type: 'boolean',
        description: 'Set this attachment as the card cover image (only for image URLs)'
      }
    },
    required: ['apiKey', 'token', 'cardId', 'url']
  }
};

export async function handleTrelloAddAttachmentUrl(args: unknown) {
  try {
    const { apiKey, token, cardId, ...attachData } = validateAddAttachmentUrl(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.addAttachmentUrl(cardId, attachData);
    const attachment = response.data;

    const result = {
      summary: `Attached URL "${attachment.name}" to card`,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        date: attachment.date,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error adding URL attachment: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Add Attachment (File Upload) ───────────────────────────────────

export const trelloAddAttachmentFileTool: Tool = {
  name: 'trello_add_attachment_file',
  description: 'Upload a local file as an attachment to a Trello card. Use this to attach screenshots, images, or documents. Limit: 10 MB (Free) / 250 MB (Paid).',
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
        description: 'ID of the card to attach the file to',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      filePath: {
        type: 'string',
        description: 'Absolute path to the local file to upload (e.g., "C:/Users/.../screenshot.png")',
        minLength: 1
      },
      name: {
        type: 'string',
        description: 'Display name for the attachment (optional, defaults to filename)',
        maxLength: 256
      }
    },
    required: ['apiKey', 'token', 'cardId', 'filePath']
  }
};

export async function handleTrelloAddAttachmentFile(args: unknown) {
  try {
    const { apiKey, token, cardId, filePath, name } = validateAddAttachmentFile(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.addAttachmentFile(cardId, filePath, name);
    const attachment = response.data;

    const result = {
      summary: `Uploaded file "${attachment.name}" to card`,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType,
        date: attachment.date,
        bytes: attachment.bytes,
        isUpload: attachment.isUpload
      },
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error uploading file attachment: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Delete Attachment ──────────────────────────────────────────────

export const trelloDeleteAttachmentTool: Tool = {
  name: 'trello_delete_attachment',
  description: 'Delete an attachment from a Trello card.',
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
        description: 'ID of the card containing the attachment',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      attachmentId: {
        type: 'string',
        description: 'ID of the attachment to delete (get this from trello_get_card_attachments)',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'cardId', 'attachmentId']
  }
};

export async function handleTrelloDeleteAttachment(args: unknown) {
  try {
    const { apiKey, token, cardId, attachmentId } = validateDeleteAttachment(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteAttachment(cardId, attachmentId);

    const result = {
      summary: `Deleted attachment ${attachmentId} from card ${cardId}`,
      rateLimit: response.rateLimit
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error deleting attachment: ${errorMessage}` }],
      isError: true
    };
  }
}

// ── Download Attachment ────────────────────────────────────────────

const MAX_INLINE_TEXT_BYTES = 1024 * 1024;
const TEXT_EXTENSIONS = /\.(md|markdown|txt|csv|tsv|json|ya?ml|xml|html?|css|js|ts|sql|log)$/i;

export const trelloDownloadAttachmentTool: Tool = {
  name: 'trello_download_attachment',
  description: 'Download an uploaded file attachment of a Trello card. A text file (Markdown, CSV, JSON, HTML, ...) up to 1 MB comes back inline as text; any other file is saved to a local temp directory and its path comes back.',
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
        description: 'ID of the card containing the attachment',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      },
      attachmentId: {
        type: 'string',
        description: 'ID of the attachment to download (get this from trello_get_card_attachments)',
        pattern: '^[a-zA-Z0-9]{1,24}$'
      }
    },
    required: ['apiKey', 'token', 'cardId', 'attachmentId']
  }
};

export async function handleTrelloDownloadAttachment(args: unknown) {
  try {
    const { apiKey, token, cardId, attachmentId } = validateDownloadAttachment(args);
    const client = new TrelloClient({ apiKey, token });

    const { data: attachment } = await client.getCardAttachment(cardId, attachmentId);
    if (!attachment.isUpload) {
      return {
        content: [{ type: 'text' as const, text: `"${attachment.name}" is a link, not an uploaded file: ${attachment.url}` }]
      };
    }

    const { body, contentType } = await client.downloadAttachment(attachment.url);
    const isText = TEXT_EXTENSIONS.test(attachment.name) || /^text\/|json|xml/.test(contentType);
    if (isText && body.length <= MAX_INLINE_TEXT_BYTES) {
      return {
        content: [{ type: 'text' as const, text: `=== ${attachment.name} (${body.length} bytes) ===\n${body.toString('utf8')}` }]
      };
    }

    const dir = join(tmpdir(), 'trello-attachments');
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${attachmentId}-${basename(attachment.name).replace(/[^\w.-]/g, '_')}`);
    await writeFile(filePath, body);

    return {
      content: [{
        type: 'text' as const,
        text: `Saved "${attachment.name}" (${body.length} bytes, ${contentType || 'unknown type'}) to ${filePath}`
      }]
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);

    return {
      content: [{ type: 'text' as const, text: `Error downloading attachment: ${errorMessage}` }],
      isError: true
    };
  }
}
