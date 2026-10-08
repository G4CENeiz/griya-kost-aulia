# ADR 0028: A calendar day is stored as an ISO date, an instant as epoch milliseconds

- Status: Accepted
- Date: 2026-10-08

## Context

`docs/SPEC.md` says that every timestamp is an integer count of epoch
milliseconds in UTC, rendered for the Indonesian locale at the edge of the UI.
That is right for an instant. It is wrong for a rental day. A tenancy starts on
a date on a calendar, and an epoch value at UTC midnight shifts to the previous
day for a reader in a negative offset, and invites off-by-one bugs in every
comparison and in every period calculation.

## Decision

Two kinds of time value, stored differently and named so the difference is
visible at the column:

- An instant: `created_at`, `updated_at`, `issued_at`, `rendered_at`,
  `voided_at`. Integer epoch milliseconds in UTC.
- A calendar day: `start_date`, `move_out_date`, `period_start`, `period_end`,
  `due_date`, `date`. ISO `YYYY-MM-DD` text.

The date helpers in `src/lib/dates.ts` are the only place that does calendar
arithmetic, and they work in UTC so no local offset can move a day.

## Consequences

- A date column reads the same in the database, in the API, and on the screen.
- Comparing days is a string comparison, and adding a month clamps the day, so
  the 31st of January plus one month is the 28th of February.
- An instant still needs a locale at the edge, which the UI supplies with
  `Asia/Jakarta`.
- This supersedes the "all timestamps" sentence of `docs/SPEC.md`, which was
  corrected to match.
