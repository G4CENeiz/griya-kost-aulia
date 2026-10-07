# ADR 0002: Plain TanStack Start, deployed to Cloudflare Workers

- Status: Accepted
- Date: 2026-10-06

## Context

One application must serve a public landing page, a public vacancy list, and a
private admin area that writes to a database and stores generated files. The
admin is a single user. The app must deploy with low operating effort and low
cost.

## Decision

Use TanStack Start (React) as a plain scaffold, enabled for Cloudflare with the
Cloudflare Vite plugin, and deploy the whole app as one Worker. Public pages,
admin pages, and server routes live in the same application and share one data
model.

## Consequences

- One codebase, one deploy, one origin for public and admin traffic.
- Room and vacancy data has a single source of truth, so the public page cannot
  disagree with the admin records.
- Runtime-specific code must stay within the Workers runtime: no Node APIs, no
  child processes, no filesystem.
