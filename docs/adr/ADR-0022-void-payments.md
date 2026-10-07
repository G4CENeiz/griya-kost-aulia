# ADR 0022: Payments are voided, never edited or deleted

- Status: Accepted
- Date: 2026-10-06

## Context

A payment can be typed wrong. A tenant may already hold a printed receipt for
it. A ledger whose rows can change or disappear cannot be trusted for money.

## Decision

- A payment is never edited and never deleted.
- `pembayaran` carries `dibatalkan_pada` and `alasan_batal`. The reason is
  required.
- A voided payment stays visible in every list, greyed out, with its reason.
- Every balance, total, and report ignores voided rows.
- A correction is a void plus a new payment.
- A receipt whose payment is voided renders with a `DIBATALKAN` marker. The
  receipt number does not change.

## Consequences

- Balances and totals filter on one column. Forget the filter and the number is
  wrong, so the filter belongs in one query helper, not at each call site.
- The ledger keeps every mistake and its explanation, which is the point.
- The admin needs a void action with a reason prompt on the payment row.
