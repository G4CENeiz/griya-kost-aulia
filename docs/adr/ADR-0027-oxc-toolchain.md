# ADR 0027: Linting and formatting use the oxc tools

- Status: Accepted
- Date: 2026-10-08

## Context

The TanStack CLI offers two toolchains: Biome and ESLint with Prettier. The
owner asked for the oxc tools instead: oxlint for linting and oxfmt for
formatting. The CLI cannot install them, so the scaffold was created with no
toolchain and the tools were added by hand.

## Decision

- `oxlint` lints with the correctness and suspicious categories, and with the
  TypeScript, unicorn, oxc, react, jsx-a11y, and import plugins.
- `oxfmt` formats with single quotes, no semicolons, sorted imports, and sorted
  Tailwind classes.
- `oxfmt` ignores `docs/`, so the accepted ADRs, the spec, and these notes keep
  their own line breaks. Prose is the owner's, not the formatter's.
- Biome and Prettier are not used anywhere in the project.
- `pnpm check` runs, in order: `wrangler types`, `oxfmt --check`, `oxlint`, and
  `tsc --noEmit`. A step is not finished while `pnpm check` fails.
- The TypeScript `lib` list is ES2023, because oxlint asks for `toSorted` over
  `sort`. The Workers runtime is V8 and already has it.

## Consequences

- One toolchain, one command, and no formatter churn in the owner's documents.
- Adding an ESLint plugin means adding an oxlint plugin, and nothing else.
- A warning makes `pnpm check` fail, so warnings are fixed, not tolerated.
