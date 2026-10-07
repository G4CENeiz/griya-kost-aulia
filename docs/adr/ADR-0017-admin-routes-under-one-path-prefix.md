# ADR 0017: Every admin route lives under the /admin path prefix

- Status: Accepted
- Date: 2026-10-06

## Context

One Worker serves both the public pages and the admin area. Cloudflare Access
protects the admin surface. Two facts found during the build shaped how the
in-app guard works:

- The base path of server functions is global (`serverFns.base`). Moving it
  under `/admin` would also capture the RPC calls that public page navigation
  makes, so path scoping cannot cover server functions.
- For a server function call, a request middleware receives a null
  `serverFnMeta`. It cannot tell an admin server function from a public one.
  A function middleware does receive the real `filename`.

An earlier draft assumed one path-scoped request middleware covered everything.
It did not: an unauthenticated call to an admin server function returned data.

## Decision

- Every admin page lives under `/admin`.
- Every admin server function lives in `src/server/admin/`.
- Two middlewares in `src/start.ts` share one decision function:
  - a request middleware guards page requests whose path starts with `/admin`
  - a function middleware guards server functions whose `filename` starts with
    `src/server/admin/`
- The guard verifies the `Cf-Access-Jwt-Assertion` header against the team JWKS,
  the issuer, and the audience tag. It does not trust the header's presence.
- With no Access configuration, the guard allows in development only
  (`import.meta.env.DEV`) and denies in production.

## Consequences

- The directory is the enforcement key. A server function placed outside
  `src/server/admin/` is not protected. This is the rule to check in review.
- A function middleware cannot return a Response, so a denial on the server
  function path arrives as an error envelope with HTTP 200 and no data. The page
  path returns a real 403. Verified: the denied response contains no records.
- `docs/access-guard` verification needs a configured Access layer, so the
  end-to-end test for the guard is opt-in: `ACCESS_E2E=1 pnpm exec playwright
  test tests/access-guard.spec.ts`.
