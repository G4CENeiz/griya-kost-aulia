# Notes

Things the owner asked us to keep in mind. This is not a plan and not a task
list. It is a record of what he said, so that nobody has to remember it or ask
again. Each entry carries the date he said it.

## Kuitansi template — 2026-10-08

The owner has not written the paper layout yet and does not know where to put
it. Until he sends it, step 7 builds against a plain temporary template, and
swapping the file is the whole change (ADR-0034).

A file named `kuitansi.typ` in `docs/templates/` is the expected arrival, or a
paste in the thread. It is copied to `src/kuitansi/template.typ`, because Typst
runs in the browser and Vite must bundle the file.

The values the template may use, which he asked us to keep in mind:

- Property name, tagline, address, and WhatsApp number.
- Bank name, account number, and account holder.
- Receipt number and issue date.
- Tenant name.
- Room number.
- Charge period start and end.
- Payment amount, payment date, and method.
- The amount written out in Indonesian words.
- A marker for a voided payment.

## Branches and environments — 2026-10-08

The owner wants `dev` and `staging` before `main`, so that a push is not a
release. ADR-0032 records the shape. Two things he needs to know when it is set
up:

- Each environment needs its own D1 database and its own R2 bucket.
- The Access policy must cover the staging hostname, or the admin area there is
  unreachable rather than open, because the guard fails closed.

He deferred the whole setup until the app ships.

## Room status — 2026-10-08

He says he may need the third room state. The three labels already exist and
already work. What does not exist is a state he sets by hand that the records
cannot derive, for example "dipesan" for a room held for a future tenant. If he
asks for it, it is a new column, a migration, and a field on the room form
(ADR-0029).

## Admin look — 2026-10-08

His words: the admin area must look like internal software of a startup, not a
page with a bar on top. A vertical navigation rail, a page header, cards, and
tables. Shadcn is there for exactly this (ADR-0030). The first layout failed
this and is being replaced.

## Public site — 2026-10-08

His words: one page is weak. A visitor must be able to browse rooms, open one
room, read the house rules, and read the FAQ. ADR-0031 records the page set and
the layouts. He also wants the look of a modern product site, which the first
attempt did not have.

Still undecided, and recorded here rather than acted on:

- Whether pictures belong to a room as well as to a page. A room detail page
  reads the page gallery today.
- Whether the FAQ is an accordion. It is one section per question in Markdown
  today.
- Whether the owner may hide a built-in page, for example the FAQ, from the
  navigation.

## Markdown and pictures — 2026-10-08

Markdown carries words only. `![foto](/media/x.png)` becomes the word "foto"
(ADR-0024). Pictures arrive through the Galeri card. He has been told once; it
belongs in the wording on the editor screen as well.

## Theme package — 2026-10-08

The copied toast component read the theme from `next-themes`. The app has no
dark mode, so the import is removed and the toast is fixed to light. One
dependency fewer.

## Local demo data — 2026-10-08

The local D1 holds demonstration records made while verifying the build steps: a
room type, two rooms, one tenant, three charges, and five payments, two of them
voided. To clear them, stop the dev server and delete `.wrangler/state`.

## Push credentials — 2026-10-08

`git push` over HTTPS needs a credential helper, and none is configured on this
machine. Until the owner runs `gh auth setup-git` once, a push is done with:

```
git -c credential.helper='!gh auth git-credential' push origin main
```

## Guard behaviour in production — 2026-10-08

With `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` empty, the admin guard denies every
request in production. The site fails closed. The admin area is therefore
unusable, not open, until the Access layer exists.
