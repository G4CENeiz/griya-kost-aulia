# Handoff

Written 2026-10-07 by the previous thread, for the next one. Read this before
you touch anything.

## Status

The repository holds documentation only. There is no code, no package manifest,
and no git remote. An earlier attempt built and deployed the app; the owner had
it all reverted, and the Cloudflare resources were deleted. The account has no
Worker, no D1 database, and no R2 bucket for this project.

## What the project is

A website for one boarding house in Indonesia: a public landing page, a public
room list, and a private admin area that records rooms, room types, tenants,
tenancies, charges, payments, and receipts.

## Where the design lives

- `docs/SPEC.md` is the entry point. It lists the stack, the tables, the rules,
  and the build order.
- `docs/glossary.md` maps each Indonesian UI label to its English code name.
- `docs/adr/` holds 26 decisions. Read them. Do not re-litigate them.

## Working agreement from the owner

The standing rules for agents now live in `AGENTS.md`, which includes this
agreement and everything the owner added later. Read that file first.

These are the owner's words, given after the earlier attempt went wrong. They
are binding.

1. **Do not deploy.** Do not run `wrangler deploy`. Do not create, change, or
   delete any Cloudflare resource. Do not add a git remote. Do not push. Do any
   of these only when the owner asks for that exact action in a message.
2. **Ask before external or shared actions.** Write what you are about to do and
   wait for confirmation.
3. **One step at a time.** At the end of a step, stop, report, and wait for
   review. Do not roll into the next step on your own.
4. **For review, run a local dev server only.** The owner wants to inspect and
   judge before anything leaves the machine.
5. **Automatic deploy on push comes later.** The owner wants it through
   Cloudflare Workers Builds or GitHub Actions. Not now, and not until asked.
6. **Commit your own work.** Conventional Commits, one logical change per
   commit, no pushing.
7. **Internal names are English.** Tables, columns, types, functions, and files.
   UI copy is Indonesian.
8. **Report style.** Google developer documentation style, ASD-STE100 Simplified
   Technical English. Short sentences, active voice.

## The earlier attempt, and why it was reverted

The previous thread asked for approval of build step 1 and wrote it as one
sentence:

> Step 1 is `git init`, then the pnpm scaffold with TanStack Start, the
> Cloudflare plugin, Tailwind, and shadcn/ui, then D1 and R2 bindings, the schema
> with the constraints, and the Pengaturan screen, deployed behind Access.

The owner said "Go". The thread read that as approval for the whole list and
ran, using the OAuth credentials already stored on the machine:

```
pnpm exec wrangler d1 create griya-kost-aulia-db
pnpm exec wrangler r2 bucket create griya-kost-aulia-media
pnpm exec wrangler d1 migrations apply griya-kost-aulia-db --remote
pnpm deploy          # vite build && wrangler deploy
```

That created a database, a bucket, and a public URL in the owner's Cloudflare
account before the owner had reviewed a single line of code. Wrangler
credentials for the owner's Cloudflare account are stored in the wrangler
config directory on this machine. Having them is not permission to use them.

The owner then had the Worker, the bucket, and the database deleted, and the
code reverted to these documents. That is where the project stands now.

The mistake was not the plan. The mistake was that the plan buried three
account-level actions in one line of a step list, and a single "Go" was treated
as approval for all of them. Write account-level actions in their own message,
in plain words, and wait.

One more lesson: the previous thread also wrote "deploy to a public URL" in its
own explanation, as if the owner had approved that phrase. The owner had not.
Do not paraphrase your own earlier words as if they were the owner's approval.

## Design decisions that carry into the build

Read the ADRs for the reasoning. The short version:

- TanStack Start on Cloudflare Workers, with pnpm, Tailwind v4, and shadcn/ui
  components copied into the repository (ADR-0002, ADR-0011, ADR-0015).
- D1 for records. R2 for receipt PDFs and gallery images (ADR-0009).
- Admin authentication is Cloudflare Access, with no login form in the app
  (ADR-0008). The app must verify the Access JWT as well.
- ADR-0017 records the guard mechanism, and it was corrected from evidence:
  a request middleware receives null metadata for a server function call, so it
  cannot tell an admin function from a public one. A function middleware does
  receive the real source file. Pages are matched by the `/admin` path, admin
  server functions by the `src/server/admin/` directory. The correction was
  measured during the deleted build and is kept, because the earlier text was
  wrong and would mislead you.
- No deposit is collected. A charge is settled by one payment or by two
  installments (ADR-0023, ADR-0026).
- A tenancy is one row per stay. The charges carry the term (ADR-0004).
- One active tenancy per room and per tenant, enforced by partial unique indexes
  (ADR-0012).
- Payments are voided with a reason, never edited or deleted (ADR-0022).
- The property identity is an admin-editable settings row (ADR-0020). Page
  content is one Markdown body per page (ADR-0024).
- Receipt PDFs are compiled by Typst WebAssembly in the admin browser
  (ADR-0010, ADR-0016). The receipt layout waits for the owner's template.
- Copy is Indonesian. Internal names are English (ADR-0003).

## Build order

From `docs/SPEC.md`:

1. Scaffold, D1 and R2 bindings, schema and migrations, the Pengaturan screen.
2. Rooms and room types.
3. Tenants and tenancies, with renewal, room move, and move-out.
4. Charges and payments.
5. Dasbor.
6. Halaman editor, gallery upload, landing page, room list, WhatsApp enquiry.
7. Kuitansi rendering, when the receipt template arrives.

Step 1 as written ends with "Deploy the skeleton behind Access". Treat that as a
separate action with its own approval. It is not part of scaffolding.

## Environment facts that save time

- Node 24.21.0 and pnpm 12.9.1, both under `/home/gace/.vite-plus/bin`.
- The TanStack CLI scaffolds a working app non-interactively:

  ```
  pnpm dlx @tanstack/cli@latest create . --framework react \
    --deployment cloudflare --package-manager pnpm --no-examples \
    --no-intent --toolchain biome --no-git --target-dir . --force
  ```

- The shadcn CLI prompts interactively and `--yes` does not skip every question.
  What worked instead: fetch each component from
  `https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`, fetch the theme CSS
  from `https://ui.shadcn.com/docs/theming`, write `components.json`, and install
  `class-variance-authority clsx tailwind-merge lucide-react radix-ui` plus
  `shadcn tw-animate-css` for the theme import.
- Playwright browsers are cached at `/home/gace/.cache/ms-playwright`. The
  cached build must match the `@playwright/test` version, or run
  `pnpm exec playwright install chromium`.
- Cloudflare Access needs a team name only, not a domain, and it can protect a
  `workers.dev` hostname. Zero Trust onboarding is free.
- Typst cannot run as a binary in a Worker. It runs as WebAssembly, about 7.6 MB
  of compiler plus 4.4 MB of fonts. WebKit on iOS gives WebAssembly far less
  memory than Chrome, so browser-side compilation is desktop only. The owner
  accepted that, and accepted the free Workers plan.
- The generated route tree and the Worker type file are worth ignoring in git.
  `vite build` regenerates the route tree, and `wrangler types` regenerates the
  types.

## First action

State your plan and wait for the owner's confirmation. Do not scaffold, install,
or run anything before that.
