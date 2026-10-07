# ADR 0013: Charges and due dates

- Status: Accepted
- Date: 2026-10-06

## Context

Rent is collected per period. A period is one month or a whole block of three or
more months. The admin decides the payment shape once, at the start of the term.

## Decision

- Creating a tenancy creates all charges for its term in one operation.
- Each charge carries its own due date.
- A charge is settled by one payment or by two installments.
- The system stores no late state. The UI compares the due date with today and
  shows an overdue marker as a derived value.

## Consequences

- No scheduler and no background job is needed to create charges.
- The balance of a charge is derived from its payments.
- Overdue is a display rule, so it can change without a data migration.
- Changing a term after creation needs an explicit admin action, because the
  charges already exist.
