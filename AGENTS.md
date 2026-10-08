# AGENTS.md

Standing instructions for any agent working in this repository. They come from
the owner. The newest message from the owner wins where the two disagree.

## Read first

1. `docs/HANDOFF.md` — what happened before, and the rules that came out of it.
2. `docs/SPEC.md` — the settled spec. If it and an ADR disagree, the ADR wins.
3. `docs/adr/` — every accepted decision. Read before you change a behaviour.
4. `docs/glossary.md` — the Indonesian UI label for each English code name.
5. `docs/NOTES.md` — things the owner asked us to keep in mind. Read before you
   plan, and add to it when he asks for something remembered.

## The owner's binding rules

1. **Never deploy, and never create, change, or delete a Cloudflare resource.**
   No `wrangler deploy`, no `d1 create`, no `r2 create`, no migrations with
   `--remote`, no Access change. Do any of these only when the owner asks for
   that exact action in a message. "Ship it", "go", or an approval of a build
   step is not that ask.
2. **Never read the wrangler credentials.** Having them on the machine is not
   permission to use them.
3. **Ask before an external or shared action**, in its own message, in plain
   words, and wait.
4. **One step at a time.** Finish the step, report it, and stop. Do not roll
   into the next step on your own.
5. **For review, run a local dev server.** Never a remote environment.
6. **Commit your own work.** Never end a turn with uncommitted changes.

## Code conventions

- Internal names are English: tables, columns, types, functions, files. UI copy
  is Indonesian. `docs/glossary.md` maps one to the other.
- Framework: TanStack Start on Cloudflare Workers, one Worker for the public
  site and the admin area. React and TypeScript, strict.
- Toolchain: `oxlint` and `oxfmt`. Never Biome or Prettier (ADR-0027).
- `pnpm check` must pass before a commit: `wrangler types`, `oxfmt --check`,
  `oxlint`, `tsc --noEmit`.
- Components come from `shadcn/ui` and are copied into `src/components/ui/`.
  Edit a copied component in place; do not wrap it to work around it.
- Server functions in `src/server/admin/` are behind the Access guard. A public
  read never lives there, and never imports a guarded module (ADR-0017).
- Validation happens at the boundary: every value a server function receives is
  parsed and checked before it reaches a query.
- Money is whole rupiah. A calendar day is ISO text; an instant is epoch
  milliseconds (ADR-0028).
- Dates, money, and status labels are formatted in one place each, never at the
  call site.

## Commits

- Conventional Commits: `type(scope): summary`.
- Summary in the imperative, lowercase, no trailing period, 72 characters or
  less. The reason goes in the body, not the summary.
- One logical change per commit, and one type per commit. If you cannot name a
  commit with a single type, split it.
- Order the commits so the tree builds after each one.
- Push to `origin` only as part of a step the owner asked for. A deploy is never
  implied by a push.

## Documentation

- A decision goes in an ADR: 4-digit number, status line, date, then Context,
  Decision, and Consequences. New decisions get new numbers; never rewrite an
  accepted ADR, mark it superseded instead.
- Something the owner asks us to remember goes in `docs/NOTES.md`, with the
  date and with enough context to act on it.
- New UI vocabulary goes in `docs/glossary.md`.
- Write in the Google developer documentation style and ASD-STE100 Simplified
  Technical English: short sentences, active voice, present tense.

## Verification

- Prove the behaviour, do not read the diff and call it done.
- For UI work, render it in a browser and look at it. A screenshot of the
  rendered state is not optional, and neither is reading it.
- For data rules, exercise them against the local D1: the refusal belongs in the
  test, not only in the code.
- Report what passed, what failed, and what you did not check.
- Leave the dev server running when the owner may want to look at the work.
