# ADR 0030: The admin area is a sidebar shell

- Status: Accepted
- Date: 2026-10-08

## Context

The first admin layout put the screen links in a horizontal bar across the top.
With ten screens (Dasbor, Kamar, Tipe Kamar, Penghuni, Sewa, Tagihan,
Pembayaran, Halaman, Galeri, Pengaturan) that bar either wraps, shrinks the
labels, or scrolls sideways. The owner asked for the shape internal software
normally has: a vertical navigation rail, a clear page header, and content in
cards and tables.

## Decision

- A fixed vertical sidebar holds the navigation, one entry per screen, with the
  current entry marked. It is the only navigation the admin area has.
- The content column has a page header: the screen title, a short description,
  and the primary action for that screen, right-aligned.
- Records are cards containing tables. Money, dates, and status values are
  formatted in one place each (`src/lib/format.ts`, `src/lib/room-status.ts`).
- `shadcn/ui` components carry the look. We copy them in, so a component whose
  default does not fit is edited in place (ADR-0011).
- The sidebar is a layout, not data. A screen that does not exist yet is not in
  the sidebar.

## Consequences

- Adding a screen means one entry in the sidebar and one route file.
- The records stay reachable on a narrow laptop screen without a horizontal
  scroll in the navigation.
- The sidebar is the same on every admin screen, so the owner learns it once.
