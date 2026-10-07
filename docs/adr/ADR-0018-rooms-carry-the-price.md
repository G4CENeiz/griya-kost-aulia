# ADR 0018: Rooms carry the price, types carry the facilities

- Status: Accepted
- Date: 2026-10-06

## Context

The property has Type A and Type B. Type B is uniform. Type A varies in price by
floor level. A price stored on the type cannot express that.

## Decision

- `tipe_kamar` holds a name, a description, and the facility list.
- `kamar` holds the room number, its type, its floor, and its own price.
- The public list shows each room with its own price.
- The admin sets a price per room. A type may carry a default price that fills
  the form, but the room value is the truth.

## Consequences

- A floor-dependent price needs no extra entity.
- Changing a type's facility list updates every room of that type, because the
  facilities live in one place.
- Nothing in the model is negotiated per tenant (ADR-0012).
