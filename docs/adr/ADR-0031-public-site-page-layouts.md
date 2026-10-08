# ADR 0031: The public site is a set of fixed page layouts

- Status: Accepted
- Date: 2026-10-08

## Context

The first public site was one page: a hero, the room list, one Markdown body, a
gallery, and a footer. The owner rejected it. A visitor who is comparing
boarding houses wants to look at the rooms one by one, read the house rules,
and read answers to the questions everyone asks. One page cannot carry that,
and a page whose whole layout comes from one Markdown body puts the layout in
the wrong hands anyway.

## Decision

The app owns the layout. The owner owns the words and the pictures.

Built-in pages, each with its own layout, addressed by a fixed slug:

| Slug | Address | Layout |
|---|---|---|
| `home` | `/` | sticky header, hero, facility strip, room preview with a link to the full list, the owner's prose, gallery, contact footer |
| `rooms` | `/kamar` | every room with search and filters (type, floor, price, status), each card links to its room |
| `room` | `/kamar/<number>` | one room: number, type, floor, price, facilities, derived status, the gallery, and an enquiry that names the room |
| `rules` | `/aturan` | the owner's prose, plus the fixed house-rules shell |
| `faq` | `/faq` | the owner's questions and answers, one section per question |
| `contact` | `/kontak` | address with a map link, WhatsApp, bank details, and the enquiry form |
| any other | `/<slug>` | the generic shell: title, prose, gallery, footer |

- The header carries the navigation and a WhatsApp call to action on every
  public page. The footer carries the address, the map link, WhatsApp, and the
  bank details from the settings row.
- A page that is not published returns 404 for a visitor (ADR-0024 keeps the
  published flag).
- The owner's words stay one Markdown body per page, and the pictures stay the
  gallery of that page. The owner cannot move a section or change an order.
- Adding a new section to a layout is a code change, not a setting. That is the
  point: the layouts stay few, known, and consistent.
- This supersedes the single-shell layout of ADR-0021 and the "same shell
  without the room list" of ADR-0024 in part.

## Consequences

- A visitor can reach a room, its price, its facilities, and its status in one
  click, and can ask about that exact room.
- Markdown carries prose only. Pictures arrive through the gallery, so no page
  layout depends on a link the owner pastes.
- The room detail page needs no new table today: it reads the room records and
  the page gallery. Pictures that belong to one room rather than to the page
  are a later decision, and they are recorded in `docs/NOTES.md`.
