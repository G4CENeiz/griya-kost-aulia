# ADR 0023: No deposit is collected

- Status: Accepted
- Date: 2026-10-06

## Context

ADR-0004 assumed a one-time deposit at move-in. The owner collects none. A
deposit that does not exist adds a payment kind, a held-balance calculation, a
return record, and a withholding reason, all unused.

## Decision

- No deposit is collected, returned, withheld, or tracked.
- Payments settle rent charges only, so `payments` has no kind column and no
  row points at a tenancy instead of a charge.
- Move-out records a date only.

## Consequences

- One money path instead of two. The unpaid-charge view needs no filter.
- This supersedes the deposit rule in ADR-0004 and the deposit field planned for
  the settings page.
- Adding a deposit later is a new payment kind and a held-balance query. It is
  not free, but nothing in the current shape blocks it.
