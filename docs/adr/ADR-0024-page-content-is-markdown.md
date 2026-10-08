# ADR 0024: Page content is one Markdown body

- Status: Accepted, superseded in part by ADR-0031 and ADR-0033
- Date: 2026-10-06

## Context

An earlier draft made the landing page a structured section editor: nine section
types, per-type fields, ordering, visibility, and a schema per type. The owner
does not want that many knobs, and read it as a content management product
bolted onto a boarding house site.

What the owner actually wants is a text editor for the words, and the app's own
layout for everything else.

## Decision

- `pages` holds slug, title, Markdown body, and a published flag. There are no
  section tables, no section types, and no ordering UI.
- The admin edits the body in a Markdown editor with a live preview of the whole
  page, not only the text.
- The app assembles the public page in a fixed order: hero from the identity
  settings, room list from the records, the Markdown body, the gallery, then the
  footer.
- The Markdown subset is headings, bold, italic, links, bullet lists, numbered
  lists, blockquotes, horizontal rules, and paragraphs.
- Raw HTML is not rendered. A pasted `<script>` shows as text. This is a
  security boundary.
- Images never come from Markdown. They come from the gallery upload, which is
  the only image path (ADR-0025).
- Edits go live on save. There is no draft, no approval, and no scheduling.
- The owner can add more pages. A new page gets the same shell without the room
  list.

## Consequences

- The Halaman screen is a text area, a preview, and a Save button. Nothing else
  to learn.
- The property identity stays in settings (ADR-0020) because the app reads those
  values: the WhatsApp link, the map, and the receipt.
- Rooms stay records because they change and they drive availability.
- Moving the room list above or below the prose is a one-line layout change, not
  a data change. The prose cannot reorder the page.
