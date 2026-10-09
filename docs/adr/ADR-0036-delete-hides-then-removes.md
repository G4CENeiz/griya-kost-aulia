# ADR 0036: A delete hides the record first, and a permanent delete is a second act

- Status: Accepted
- Date: 2026-10-08

## Context

The owner asked for three things at once: that every record's CRUD be complete
and correct, that every record have its own view, and that deleting hide the
record by default with a permanent delete available as the alternative.

Today every delete is immediate and irreversible, and several of them are
refused outright because the ledger depends on the record: a room type that a
room uses, a room or a tenant with tenancy history, a tenancy with charges, a
charge with a payment. That refusal is correct for a permanent delete and wrong
for "take this out of my lists".

## Decision

- Every record table gains `deleted_at`. No delete removes a row any more.
- **Soft delete is the default.** It sets `deleted_at`, and the record leaves
  every list, the public site, every balance, and every availability count. It
  is allowed even when the record has history, because hiding a record cannot
  break the ledger.
- **Hiding is refused while the record takes part in a live state**, because a
  hidden record that a live screen still depends on is a state no screen can
  repair: a tenant with a running stay, a room that is occupied, a room type
  that a live room uses, a tenancy with unpaid charges. The message names the
  live row that blocks the hide, and the owner ends that state first.
- **Restore** clears `deleted_at`, and is what makes a soft delete safe.
- **Permanent delete is the second act.** It removes the row, and it keeps the
  guards: a record that a live row still references is refused, with the count
  in the message. For a gallery image it also removes the R2 object.
- Unique values are unique among live rows only, so the number, name, or slug
  of a deleted record may be used again. **Superseded by ADR-0037**: a deleted
  record keeps its unique value until it is purged, because freeing it needs a
  table rebuild that D1 cannot run.
- The deleted records of a screen appear on that same screen in a trash
  section, so they are found where they were deleted. There is no global trash
  screen.
- Every record gets an individual view: the record itself and the rows that
  reference it.
- **Payments keep their own rule.** A payment is voided, with a reason, which is
  its soft delete, and it stays in the ledger until it is permanently deleted. A
  payment must be voided before it can be permanently deleted. This supersedes
  the "never deleted" sentence of ADR-0022 in part; the reason and the visibility
  rules of that ADR stand.

## Consequences

- Every read must filter on `deleted_at IS NULL`. One missed filter shows a
  deleted record, so the filter belongs in each query and the audit of those
  queries is part of the change.
- The unique constraints move from the table definition to partial unique
  indexes, which is a one-time table rebuild in the migration that adds the
  column.
- A permanent delete is irreversible, so it carries its own confirmation and it
  names what will be refused.
- The refusal messages change meaning: they now belong to the permanent delete,
  and they name the live rows that block it.
