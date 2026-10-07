# ADR 0014: The vacancy list shows room numbers, enquiries go to WhatsApp

- Status: Accepted
- Date: 2026-10-06

## Context

Visitors need to see what is vacant and reach the owner quickly.

## Decision

- The public vacancy list shows individual room numbers, read from the room
  records the admin edits.
- No tenant data appears in public.
- The enquiry form does not write to the database. It composes a WhatsApp
  message to the owner's number and opens WhatsApp.

## Consequences

- No enquiry table, no spam surface, and no notification path to build.
- An enquiry that the visitor abandons leaves no trace.
- The public list shows the building layout by room number. This is the owner's
  explicit choice.
