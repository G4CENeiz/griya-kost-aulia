# ADR 0021: Landing page sections

- Status: Accepted, superseded in part by ADR-0031
- Date: 2026-10-06

## Context

The landing page needs a shape before its content exists. Photos do not exist
yet.

## Decision

The landing page has these sections, in order:

1. Hero with the property name, the tagline, and a WhatsApp button.
2. About the property.
3. Room list with prices and availability.
4. Facilities.
5. Gallery. Placeholder blocks until real photos exist.
6. Location with a map link.
7. House rules.
8. FAQ.
9. Contact footer.

Copy is Indonesian. The prose is one Markdown body on the page (ADR-0024). The
section order is fixed by the app.

## Consequences

- The page is complete and reviewable before the real text arrives.
- Placeholder prose must be obviously a placeholder, so nothing fake ships by
  accident.
- The gallery is the only section with no data source. It renders fixed
  placeholders until an image field exists (ADR-0009).
