import { env } from 'cloudflare:workers'

/**
 * The D1 binding. Read it inside a request, not at module scope.
 */
export function getDb(): D1Database {
  return env.DB
}

export function nowMs(): number {
  return Date.now()
}

/**
 * True when D1 refused a write because a unique index already holds that value.
 * A pre-check would race with another writer, so the index stays the authority.
 */
export function isUniqueViolation(error: unknown, column: string): boolean {
  const message = String(error)
  return message.includes('UNIQUE constraint failed') && message.includes(column)
}

/** True when an UPDATE or DELETE matched no row. */
export function changedNothing(meta: { changes?: number }): boolean {
  return (meta.changes ?? 0) === 0
}
