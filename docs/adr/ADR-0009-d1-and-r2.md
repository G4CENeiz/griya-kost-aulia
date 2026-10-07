# ADR 0009: D1 for records, R2 for artifacts

- Status: Accepted
- Date: 2026-10-06

## Context

The app records rooms, tenants, tenancies, charges, payments, and receipts. It
also produces a PDF file per receipt. The two kinds of data have different
shapes and different lifetimes.

## Decision

- D1 holds all records.
- R2 holds receipt PDF artifacts. The database stores the object key only.
- R2 also holds the gallery images, uploaded from the browser (ADR-0025).
- The R2 bucket is created and bound in the first build step, so no later step
  needs an infrastructure change.
- Local development uses the D1 and R2 emulation built into `wrangler dev`, so
  no remote resources are needed to develop.

## Consequences

- The database stays small and cheap to query.
- Receipt PDFs can be regenerated from the records at any time, so a lost
  artifact is not data loss.
- Backup is a separate concern. Add a scheduled export of D1 later.
