import { z } from 'zod';
import { formatValidationError } from './validation.js';

/**
 * Turns anything a tool handler can catch into a message worth showing.
 *
 * `TrelloClient.makeRequest` rejects with a plain object (`{ message, status, code }`),
 * not an Error instance. A bare `error instanceof Error` check therefore misses every
 * HTTP failure and degrades it to "Unknown error occurred" - including the ones that
 * carry an actionable hint, such as an expired token on a 401.
 */
export function extractErrorMessage(error: unknown): string {
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
