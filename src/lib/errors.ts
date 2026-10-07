/**
 * A message safe to show the admin, from an error thrown by a server function.
 * Validation failures carry their own Indonesian text; anything else falls back.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim()
    if (message && message !== 'Internal Server Error') return message
  }
  return fallback
}
