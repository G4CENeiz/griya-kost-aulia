# ADR 0003: Indonesian only copy

- Status: Accepted
- Date: 2026-10-06

## Context

The readers are local renters and the owner, both in Indonesia. An English
variant would add a translation surface with no reader for it.

## Decision

Write all user-facing copy in Indonesian, on the public pages and in the admin
area. Keep code identifiers, database column names, and documentation in
English. `docs/glossary.md` maps the Indonesian UI label to the English code
name for every domain term.

## Consequences

- No translation layer and no locale switching.
- Currency amounts are formatted as Indonesian rupiah (`Rp1.500.000`).
- Dates are formatted and displayed for the Indonesian locale.
