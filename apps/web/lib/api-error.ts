/**
 * Pulls a readable message out of a NestJS error body.
 *
 * Validation failures arrive as `{ message: string[] }` (one entry per broken
 * rule), everything else as `{ message: string }`. Falls back to the caller's
 * generic text when the body carries neither.
 */
export function extractApiError(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;

  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}
