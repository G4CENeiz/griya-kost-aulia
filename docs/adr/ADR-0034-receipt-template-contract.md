# ADR 0034: A receipt renders from one template and a fixed set of values

- Status: Accepted
- Date: 2026-10-08

## Context

ADR-0010 puts Typst WebAssembly in the admin browser, and ADR-0016 makes
rendering idempotent with a deterministic object key. The paper layout is the
owner's, and the owner has not sent it yet. One value contract has to exist
before either side can be written, and it must be wide enough that the owner's
layout never asks for a value the app does not have.

## Decision

- The layout is one Typst file. The owner supplies it, or approves a plain
  temporary one. Swapping the file is the whole change.
- The template receives exactly these values:

| Value | Source |
|---|---|
| Property name, tagline, address, WhatsApp number | the settings row |
| Bank name, account number, account holder | the settings row |
| Receipt number, issue date | the receipt row |
| Tenant name | the tenant of the tenancy |
| Room number | the room of the tenancy |
| Charge period start and end | the charge |
| Payment amount, payment date, method | the payment |
| Amount in Indonesian words | derived from the payment amount |
| A voided marker | the payment's void reason |

- The rendered values are snapshotted on the receipt row, so a reprint matches
  the first print (ADR-0016).
- The number is assigned when the receipt row is created, and the object key is
  `kuitansi/<number>.pdf`.
- The screen warns that rendering needs a laptop browser, because WebKit on iOS
  gives WebAssembly too little memory (ADR-0010).

## Consequences

- The owner can design the paper without asking for a code change.
- A new value on the paper is a change to the snapshot and to the template, in
  that order.
- Step 7 is buildable now, with the plain temporary template, and the owner's
  layout lands as a file swap.
