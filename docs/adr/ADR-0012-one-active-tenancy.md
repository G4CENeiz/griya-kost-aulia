# ADR 0012: One active tenancy per room and per tenant

- Status: Accepted
- Date: 2026-10-06

## Context

A room can physically hold two people. The owner treats such a pair as one
tenant, with one payment. One person never rents two rooms.

## Decision

- A room has at most one active tenancy at a time.
- A tenant has at most one active tenancy at a time.
- Both rules are database constraints, not only application checks. A partial
  unique index on the active rows enforces them.
- The price is fixed, not negotiated. It is stored on the room and copied onto
  the tenancy at creation, so a later price change does not rewrite history.

## Consequences

- The vacancy count is a query over rooms without an active tenancy. It cannot
  double count.
- A two-person room is one record. The second person has no row of her own.
- Raising the rent affects new tenancies only. An existing tenancy keeps its
  copied amount until the admin changes it on purpose.
