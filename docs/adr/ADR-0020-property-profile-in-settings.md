# ADR 0020: The property identity is one admin-editable settings row

- Status: Accepted
- Date: 2026-10-06

## Context

The property name, address, owner name, WhatsApp number, and bank account are
unknown at build time. Hardcoding them means a code change and a deploy for
every edit. The page prose is a separate concern, held as Markdown on the page
itself (ADR-0024).

## Decision

- Store the property identity in one D1 settings row: property name, tagline,
  address, WhatsApp number, bank name, account number, and account holder.
- The account holder name is also the receipt signature name.
- The admin edits these fields on a Pengaturan screen.
- The landing page and the receipts read the same row.
- Ship placeholder values, and let the admin replace them without a deploy.
- Derived values stay out: the map link comes from the address, and the receipt
  footer is fixed Indonesian text.

## Consequences

- No identity value lives in the repository that the owner must ask a developer
  to change.
- One row and one screen. Adding a field is a migration and a form input.
- No deposit field exists (ADR-0023).
