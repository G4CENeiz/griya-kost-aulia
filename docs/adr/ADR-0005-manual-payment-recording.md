# ADR 0005: The admin records payments manually

- Status: Accepted
- Date: 2026-10-06

## Context

Rent is collected as cash or as a bank transfer to the owner's account. An
online payment gateway needs a merchant account, transaction fees, and webhook
handling, and it does not match how the money is actually collected now.

## Decision

The admin records each payment by hand: amount, date, method (cash or bank
transfer), and an optional note. The system computes the remaining balance of
the charge.

## Consequences

- No gateway integration, no webhooks, no reconciliation against external
  settlement data.
- The database is the record of truth for money received. A wrong entry is
  corrected by an admin action, not by a bank callback.
- A payment gateway can be added later for tenants who want to pay online. It
  would add a second payment source, not replace manual entry.
