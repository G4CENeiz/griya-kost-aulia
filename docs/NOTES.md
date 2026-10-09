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

## Public site inventory — 2026-10-08

The owner asked for a proper landing page, a room discovery page, a room
viewing page, information pages, a Google Maps section on the landing, and
"other stuff", and he asked for examples to choose from. This is the list. He
names what he wants, and each page that is built carries real prose (ADR-0035).

Landing page sections, in the order they would run:

| Section | What it shows | State |
|---|---|---|
| Header | navigation and the WhatsApp call to action | built |
| Hero | name, tagline, one photo, two buttons | built |
| Facilities | the facilities the rooms actually offer | built |
| Availability | the rooms with type, price, and status, and a link to the discovery page | asked for |
| Room preview | three rooms with their own prices | built |
| Prose | the owner's words | built |
| Gallery | the page pictures, or placeholders | built |
| Location | the address, an embedded Google map, and directions | asked for |
| How to rent | ask, view the room, agree, pay, move in | example |
| Price list | the price per room type, in one table | example |
| House rules teaser | three rules, a link to Aturan | example |
| FAQ teaser | the three most asked questions, a link to FAQ | example |
| Neighbourhood | walking distance to campus, market, station | example |
| Testimonials | words from current tenants | example |
| Closing call to action | one band with the WhatsApp button | example |
| Footer | address, map link, WhatsApp, bank details, quick links | built |

Pages, beyond the six built:

| Page | Address | What it shows | State |
|---|---|---|---|
| Daftar kamar with sorting and a price range | `/kamar` | the discovery page, richer | asked for |
| Harga | `/harga` | the price list per room type and floor | example |
| Fasilitas | `/fasilitas` | each facility, with a picture | example |
| Lokasi | `/lokasi` | the map in full, landmarks, and directions | example |
| Cara sewa | `/cara-sewa` | the steps, with what the tenant brings | example |
| Galeri | `/galeri` | every picture on one page | example |
| Tentang | `/tentang` | the property and the owner | example |
| Kamar per tipe | `/kamar/tipe/<name>` | rooms grouped by type | example |
| Peta kamar | `/peta-kamar` | the rooms as a plan of the building | example, needs a drawing |

Ideas that are probably too much for a boarding house of this size, listed so
they are answered rather than repeated: online booking with payment, a tenant
login, a waiting list, a newsletter, and a news section.

Map implementation, 2026-10-08: the legacy Google embed needs no key and
geocodes the address. The supported Embed API needs a key and billing, which is
the owner's decision. If he supplies a key, it goes in the environment and the
section keeps its shape (ADR-0035).

## CRUD audit before the soft-delete work — 2026-10-08

The owner asked whether the CRUD is complete and correct. This is what the code
held on that date, and what is missing.

Complete, with the create, read, update, and delete paths in place:

| Entity | Operations today |
|---|---|
| Kamar | list, create, update, delete |
| Tipe Kamar | list, create, update, delete |
| Penghuni | list, create, update, delete |
| Sewa | list, start, renew, move, set move-out date, delete |
| Halaman | list, get, preview, create, update, delete |
| Galeri | list, upload, change alt, move, delete |
| Pengaturan | get, update of the single row |

Complete by design, not by omission:

- Tagihan has no create of its own. A charge is created when a tenancy starts or
  is extended, which is what ADR-0013 asks for. Amount, due date, and delete
  exist.
- Pembayaran has no update and no delete. A payment is voided with a reason
  (ADR-0022). Permanent deletion of a voided payment is being added under
  ADR-0036.
- Pengaturan has one row, so it has no create and no delete.

Missing on 2026-10-08, and being built under ADR-0036:

1. An individual view for every record. Only Halaman has one.
2. Soft delete for every record, with restore.
3. A permanent delete as the alternative, with the guard message naming the
   live rows that block it.

## Soft delete and the individual views, built — 2026-10-09

All three items above are done, one record group per commit. Each screen now has
Lihat, a Sampah section with Pulihkan and Hapus permanen, and a permanent
checkbox in its delete dialog.

| Screen | Hidden with the record | Refused while |
|---|---|---|
| Penghuni | nothing else | a stay is running |
| Tipe Kamar | nothing else | a live room uses the type |
| Kamar | nothing else | the room is occupied |
| Sewa | its charges | the stay is running |
| Tagihan | nothing else | a live payment settles it |
| Halaman | its gallery rows | never (the landing page is refused) |
| Galeri | nothing else | never; the R2 object stays until the purge |
| Pembayaran | the void is the hide | the purge needs a void, and a receipt refuses it |

Notes that came out of the work:

- ADR-0037: a deleted record keeps its number, name, or slug until it is purged.
  Freeing the value would need a table rebuild, and D1 does not honour
  `PRAGMA foreign_keys=OFF` inside a migration transaction. Measured on
  2026-10-09 against the local database.
- A permanent delete needs a query that ignores `deleted_at`, because the live
  lookup cannot reach a row in the trash. This was a real bug on Penghuni and on
  Tagihan, and both were fixed.
- The demo data in `.wrangler/state` lost one voided payment (Rp 500.000, kamar
  02, periode April 2027) to the purge test on 2026-10-09. The rest of the seed
  is intact.
