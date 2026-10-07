# ADR 0015: pnpm, deployed to a workers.dev subdomain

- Status: Accepted
- Date: 2026-10-06

## Context

The build needs one package manager and one deploy target that does not block
development. A custom domain does not exist yet. The owner plans to buy a `.com`
domain through Cloudflare later.

## Decision

- Use pnpm.
- Deploy to the `workers.dev` subdomain first.
- Add the custom domain when it exists.

## Consequences

- One lockfile, and fast installs in CI.
- Cloudflare treats a `workers.dev` hostname as a free website, not a
  business-critical hostname. Move to the custom domain for the real launch.
- The custom domain is a configuration change, not a code change.
