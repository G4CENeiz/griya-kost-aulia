# ADR 0029: The room status stores one flag and derives the rest

- Status: Accepted
- Date: 2026-10-08

## Context

The glossary gives a room three status values: tersedia, terisi, and tidak
tersedia. Two of them are facts the records already hold. A room is terisi when
it has an active tenancy, and that is a query, not an entry. Only the owner's
own decision, withholding a room from rent, describes something the records
cannot derive.

The room table could carry a `status` column with all three values. Then an
admin action could write "terisi" for a room with no tenancy, or leave
"tersedia" on a room that a tenant occupies. Both are wrong states that no
constraint can catch.

## Decision

- `rooms.is_unavailable` is the only stored part: a flag the admin sets.
- `roomStatus()` in `src/lib/room-status.ts` is the only derivation, and both
  the admin list and the public list call it, so they cannot disagree.
- All three labels exist in the UI: Tersedia, Terisi, Tidak tersedia.

## Consequences

- No row can claim a status that the tenancy records contradict.
- A room becomes terisi the moment a tenancy starts, with no second write.
- A state the owner sets by hand and the records cannot derive, such as
  "dipesan" for a room held for a future tenant, is a new field and a
  migration. It is not free, and it is not in the model today.
