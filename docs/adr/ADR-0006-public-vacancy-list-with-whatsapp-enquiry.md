# ADR 0006: Public vacancy list plus a WhatsApp enquiry form

- Status: Accepted
- Date: 2026-10-06

## Context

The public page must show what is vacant, so it reads the same room data the
admin edits. A visitor who is interested needs a fast way to make contact.
Full online reservation with payment would add inventory locking and payment
handling for very few units.

## Decision

- The public page shows room types with availability and price, read from the
  room table. It shows no tenant personal data.
- A short enquiry form (name, WhatsApp number, preferred move-in date, message)
  composes a WhatsApp message to the owner's number.

## Consequences

- The vacancy page cannot drift from the admin records.
- Enquiries arrive in WhatsApp, which is where the owner already works.
- No reservation, no inventory lock, and no online payment on the public page.
