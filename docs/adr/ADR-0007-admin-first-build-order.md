# ADR 0007: Build the admin system first

- Status: Accepted
- Date: 2026-10-06

## Context

The landing page, the vacancy list, and the receipts all read the same records:
rooms, tenants, charges, and payments. Those records do not exist yet.

## Decision

Build in this order:

1. Data model and admin authentication.
2. Admin: rooms, tenants, tenancies, charges, payments, receipts.
3. Public landing page and vacancy list, reading live data.
4. Enquiry form and WhatsApp handoff.

## Consequences

- The public pages are written once, against real data.
- Nothing public ships until the admin can maintain the data behind it.
- The landing page waits on content and photos that do not exist yet.
