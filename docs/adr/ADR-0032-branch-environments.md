# ADR 0032: Three branches, three environments, one deploy trigger

- Status: Accepted
- Date: 2026-10-08

## Context

The owner wants work in progress to reach a preview address without touching
the live site, and a step between "finished enough" and "live". Pushing must not
mean shipping. The app already needs a database and a bucket, and a staging run
must not write into the real records.

## Decision

Three branches, and Cloudflare Workers Builds connected to the repository:

| Branch | Builds into | Data |
|---|---|---|
| `dev` | a throwaway preview address for that build | none of the owner's |
| `staging` | a staging Worker on its own hostname | a staging D1 and a staging R2 |
| `main` | the production Worker | the production D1 and the real R2 |

- Only `main` deploys to the address the tenants and the owner use.
- Each environment has its own D1 database and its own R2 bucket, so staging
  cannot write into production records.
- The Cloudflare Access policy covers the staging hostname as well as the
  production one. The admin guard fails closed, so an uncovered hostname is
  unusable rather than open.
- The production trigger is `main` only. A human click before production is a
  later option, not a requirement now.

## Consequences

- A push to `dev` cannot reach the live site or the live records.
- Staging is the place to look at a finished feature with real data shapes and
  no risk.
- The setup is an account-level action. It happens when the owner asks for it,
  which he has deferred until the app ships.
