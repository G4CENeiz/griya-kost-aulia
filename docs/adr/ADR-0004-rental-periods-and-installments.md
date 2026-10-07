# ADR 0004: Rental periods of one month or a multiple of three months

- Status: Accepted, superseded in part by ADR-0023
- Date: 2026-10-06

## Context

Tenants pay rent monthly or for a longer block. A block is always a multiple of
three months. A tenant may pay a block in one payment or in two installments. A
deposit is collected once at move-in.

## Decision

- A tenancy has a duration of 1, 3, 6, 9, or 12 months.
- A charge (tagihan) covers one payment period of the tenancy. The period is one
  month for a monthly tenancy, or the whole block for a block tenancy.
- A charge is settled by one payment or by two installments.
- The deposit is a separate one-time charge at move-in.

## Consequences

- The billing model has no arbitrary recurrence rule. Period count and length
  both follow from the tenancy duration.
- A partially paid charge is a normal state. The system must show the remaining
  balance, not only paid or unpaid.
- Duration 1 month is the only case where the period equals the term.
