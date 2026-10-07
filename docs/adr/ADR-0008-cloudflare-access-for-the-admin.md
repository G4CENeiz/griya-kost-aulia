# ADR 0008: Cloudflare Access is the admin authentication boundary

- Status: Accepted
- Date: 2026-10-06

## Context

One admin user protects money records. Options were an in-app password, a shared
secret, or Cloudflare Access. Access attaches to a Worker, so it works on a
`workers.dev` hostname and needs no custom domain. Zero Trust onboarding needs a
team name only, such as `team.cloudflareaccess.com`. The admin area therefore
has no login code to write, no password to store, and no reset flow.

## Decision

Cloudflare Access protects the admin area. The app has no login page.

- Access policies allow the owner's email only.
- The app verifies the `Cf-Access-Jwt-Assertion` header on every admin route,
  against the team domain and the application audience tag. Do not rely on the
  header being present.
- The app does not rely on `ctx.access`. Workers with Static Assets, which
  includes TanStack Start, execute behind an internal router that does not pass
  `ctx.access` to the user Worker.
- Local development runs without Access. The Access layer is edge-only.

## Consequences

- No password hashing, no session table, no reset flow.
- A deployment without the Access policy is an open admin area. The protection
  lives in Cloudflare configuration, not in the repository, so it must be part
  of the deploy checklist.
- Every admin server route needs the JWT check. One unprotected route is enough
  to expose the data.
- Adding a second user later is an Access policy change, not a code change.
