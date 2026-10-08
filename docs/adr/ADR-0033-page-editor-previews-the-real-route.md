# ADR 0033: The page editor edits content and previews the real route

- Status: Accepted
- Date: 2026-10-08

## Context

The first editor showed the form and, below it, the whole page assembled from
the draft text. The owner wants the opposite emphasis: the preview must be the
actual public route, and the editing must cover the words and the pictures
only. Layout is the app's job (ADR-0031), and an editor that renders its own
approximation of the page will drift from the page it claims to preview.

## Decision

- The screen is split: the editing column on one side, the real public route on
  the other, at a laptop width and wider.
- The preview renders the same route component the visitor gets, with the draft
  values, not a second implementation of the layout.
- The editor exposes exactly two things: the Markdown body and the page's
  gallery. The title and the published flag are fields; the address is fixed
  for a built-in page.
- The editor names the layout it previews, so the owner knows that `/faq` and
  `/` are different shapes and that neither can be rearranged.
- The preview is read-only. A control inside the preview is inert.

## Consequences

- The owner edits the words and watches the real page change. Nothing else in
  the page moves.
- A layout change is a code change with a review, never an accidental one.
- The preview is the route itself, so a preview that is wrong is a page bug,
  visible before anything ships.
