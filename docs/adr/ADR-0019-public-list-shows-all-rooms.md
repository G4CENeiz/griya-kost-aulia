# ADR 0019: The public vacancy list shows every room with a status badge

- Status: Accepted
- Date: 2026-10-06

## Context

A visitor wants to know what is available. Showing only vacant rooms hides how
full the building is. Showing tenant data would expose private information.

## Decision

The public list shows every room: number, type, price, facilities, and a status
badge. A vacant room reads "tersedia". An occupied room reads "terisi". An
unavailable room reads "tidak tersedia". No tenant data appears in public, at
any time, in any field.

## Consequences

- One list serves both the visitor and the owner's own view of the building.
- The list is a query over rooms plus a derived status, so it cannot drift.
- The occupancy of the building is public. This is the owner's explicit choice.
