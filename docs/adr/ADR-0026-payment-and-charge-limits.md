# ADR 0026: Payment and charge limits

- Status: Accepted
- Date: 2026-10-06

## Context

A charge is settled by one payment or by two installments (ADR-0004). Limits
keep the money model small: no credit balance, no reconciliation of an
overpayment, and no third state between paid and unpaid.

## Decision

- A charge has at most two non-voided payments. A third is refused.
- A payment may not exceed the remaining balance of its charge.
- The due date of a charge is editable at any time.
- The amount of a charge is editable only while it has no non-voided payment.
  Voiding the payments returns the charge to the editable state.
- A charge with no non-voided payment can be deleted. A charge with a payment
  cannot. Void the payments first.
- A unique index on `(tenancy_id, period_start)` prevents a duplicate period, so
  a double-click on Perpanjang cannot create two charges for the same period.

## Consequences

- The only intermediate state is a partially paid charge. No credit exists.
- A wrong amount is corrected by voiding the payments and editing, which leaves
  the mistake visible in the record (ADR-0022).
- Renewal is safe to retry.
