# ADR 0011: Tailwind with shadcn/ui components

- Status: Accepted
- Date: 2026-10-06

## Context

The app needs a public landing page, a public room list, and an admin area with
tables, forms, dialogs, and date inputs. These are a lot of layout and
interaction states to write by hand.

## Decision

Use Tailwind as a build-time plugin, with shadcn/ui components copied into the
repository.

## Consequences

- shadcn/ui is source code in the project, not a dependency. Change a component
  in place when its default does not fit.
- The copied components bring their own dependencies, such as Radix primitives
  and a class merge helper. Keep that list small.
- Tailwind adds no runtime to the client bundle.
