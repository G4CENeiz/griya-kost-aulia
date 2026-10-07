import { env } from 'cloudflare:workers'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * The one access decision behind both admin guards (ADR-0017). The request
 * middleware applies it to pages, the function middleware to server functions.
 */
export type AccessDecision = 'allow' | 'deny'

const ASSERTION_HEADER = 'cf-access-jwt-assertion'

let jwksCache: {
  teamDomain: string
  jwks: ReturnType<typeof createRemoteJWKSet>
} | null = null

function jwksFor(teamDomain: string) {
  if (jwksCache?.teamDomain !== teamDomain) {
    jwksCache = {
      teamDomain,
      jwks: createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`)),
    }
  }
  return jwksCache.jwks
}

export async function decideAccess(request: Request): Promise<AccessDecision> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN.trim()
  const audience = env.ACCESS_AUD.trim()

  if (!teamDomain || !audience) {
    // No Access layer is configured. ADR-0008 keeps local development free of
    // it, and ADR-0017 denies production in that state: a deploy without an
    // Access policy must not serve the admin area.
    return import.meta.env.DEV ? 'allow' : 'deny'
  }

  const assertion = request.headers.get(ASSERTION_HEADER)
  if (!assertion) return 'deny'

  try {
    await jwtVerify(assertion, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    })
    return 'allow'
  } catch {
    // An expired, unsigned, or foreign token is not a reason to explain
    // anything to the caller.
    return 'deny'
  }
}

/** A denial on the page path is a real status code. */
export function forbiddenResponse(): Response {
  return new Response('Forbidden', { status: 403 })
}
