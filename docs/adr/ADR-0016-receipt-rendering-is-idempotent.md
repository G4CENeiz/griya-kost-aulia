# ADR 0016: Receipt rendering is on demand, idempotent, and desktop only

- Status: Accepted
- Date: 2026-10-06

## Context

The admin renders a receipt at the desk, after the tenant pays. Rendering must
work at any time, any number of times, without creating duplicate records or
duplicate numbers. Compilation runs in the admin browser (ADR-0010) and is not
reliable on iOS.

## Decision

- A payment owns at most one receipt. The receipt row is created with the
  payment, and it carries the number from that moment.
- The R2 object key is deterministic: `kuitansi/<nomor>.pdf`. A second render
  overwrites the same object. It never creates a second receipt or a new number.
- Rendering is a repeatable action with no side effect on the records. The admin
  triggers it, and the trigger has no rate limit and no once-only rule.
- The render stores a content snapshot on the receipt row, so a reprint matches
  the first print. A deliberate re-render refreshes that snapshot.
- The UI warns that rendering needs a laptop browser and does not run reliably
  on iOS.

## Consequences

- A failed upload is retried safely. Nothing is half created.
- Correcting a payment after the first render does not silently change what the
  tenant already holds. The admin refreshes the snapshot on purpose.
- Receipt numbers are stable before any PDF exists, so a receipt can be quoted
  in WhatsApp before it is rendered.
