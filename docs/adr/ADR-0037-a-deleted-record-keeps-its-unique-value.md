# ADR 0037: A deleted record keeps its unique value until it is purged

- Status: Accepted
- Date: 2026-10-09

## Context

ADR-0036 decided that a unique value is unique among live rows only, so the
number, name, or slug of a deleted record may be used again. That decision
requires moving each column-level `UNIQUE` constraint into a partial unique
index (`WHERE deleted_at IS NULL`), and SQLite cannot drop a column constraint
in place. The table has to be rebuilt.

A rebuild of `rooms`, `room_types`, or `pages` is not a local edit. The
procedure needs `PRAGMA foreign_keys = OFF`, and D1 does not honour that pragma:
the statement batch runs in a transaction, and the pragma has no effect inside
one. Measured on the local database, on 2026-10-09: after
`PRAGMA foreign_keys=OFF`, `DROP TABLE ptest` on a table that `ctest` references
still fails with `FOREIGN KEY constraint failed`. Without the pragma, the
rebuild must clear and restore the whole child chain — `tenancies`, `charges`,
`payments`, `receipts` — for each table it touches.

## Decision

- The column-level `UNIQUE` constraints stay.
- A deleted record keeps its unique value while it is in the trash. The value is
  free again after a permanent delete.
- A create or update that collides with a value in the trash is refused, and the
  message says the value is in the trash and that the owner can restore or purge
  it there. The check stays in the unique index; the message only explains it.
- The rest of ADR-0036 stands, including the trash section on each screen, the
  individual view, and the permanent delete as the second act.

## Consequences

- No table rebuild, and no migration that copies the ledger.
- A value can be reused only after a purge, so the trash is part of the path to
  reuse a number or a name. The refusal message carries that instruction.
- The unique-value bullet of ADR-0036 is superseded by this ADR. Its other
  decisions stand.
