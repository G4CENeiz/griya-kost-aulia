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
