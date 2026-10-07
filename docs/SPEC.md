# Griya Kost Aulia spec

Status: settled. Rounds 1 to 7 of the interview are recorded in `docs/adr`. If
this file and an ADR disagree, the ADR wins. All timestamps are integer epoch
milliseconds in UTC, rendered for the Indonesian locale at the edge of the UI.
UI copy is Indonesian. Every internal name is English (ADR-0003).
`docs/glossary.md` maps one to the other.

## Overview

The app serves one boarding house. It has three surfaces:

- A public landing page. The app assembles it; the owner writes its prose as
  Markdown.
- A public room list with every room, its number, type, price, and status, and a
  WhatsApp enquiry form.
- A private admin area, one user, that records rooms, room types, tenants,
  tenancies, charges, payments, and receipts.

## Stack

| Concern | Choice |
|---|---|
| Framework | TanStack Start (React), plain scaffold |
| Runtime and host | Cloudflare Workers, Cloudflare Vite plugin, `workers.dev` |
| Package manager | pnpm |
| Data | D1 |
| Files | R2 |
| Receipt PDF | Typst WebAssembly, compiled in the admin browser |
| Styling | Tailwind, shadcn/ui components copied in |
| Admin authentication | Cloudflare Access on `/admin`, JWT checked in the app |
| Copy language | Indonesian |

## Actors

| Actor | Can do |
|---|---|
| Visitor | Read the landing page and the room list. Send a WhatsApp enquiry. |
| Admin | Everything under `/admin`. Authenticated through Cloudflare Access. |

## Tables

| Table | UI label | Key fields |
|---|---|---|
| `room_types` | Tipe Kamar | name, description, facilities |
| `rooms` | Kamar | number, room_type_id, floor, price, status, notes |
| `tenants` | Penghuni | name, whatsapp_number, identity_number, notes |
| `tenancies` | Sewa | room_id, tenant_id, start_date, move_out_date |
| `charges` | Tagihan | tenancy_id, period_start, period_end, amount, due_date |
| `payments` | Pembayaran | charge_id, amount, date, method, note, voided_at, void_reason |
| `receipts` | Kuitansi | payment_id, number, issued_at, rendered_at, object_key, snapshot |
| `settings` | Pengaturan | name, tagline, address, whatsapp_number, bank_name, account_number, account_holder |
| `pages` | Halaman | slug, title, body_markdown, is_published |
| `page_images` | Galeri | page_id, r2_key, alt, position |

    room_types ──< rooms
                    │
                    └──< tenancies >── tenants
                          │
                          └──< charges ──< payments ──< receipts

    pages ──< page_images

## Public page layout

Fixed order, assembled by the app:

1. Hero. Property name, tagline, and the WhatsApp button. From `settings`.
2. Room list. Every room with its number, type, price, and status. From `rooms`.
3. The Markdown body. From `pages.body_markdown`.
4. Gallery. From `page_images`, or placeholder blocks when empty.
5. Footer. Address, WhatsApp number, and bank details. From `settings`.

A second page gets the same shell without the room list.

## Rules

- A term is 1, 3, 6, 9, or 12 months (ADR-0004).
- A tenancy is one row per stay: room, tenant, start date, move-out date. The
  term has no row of its own (ADR-0004).
- One active tenancy per room and per tenant, enforced by a partial unique index
  (ADR-0012).
- Rooms carry the price. Room types carry the facilities (ADR-0018).
- Creating a tenancy creates all charges for its term (ADR-0013).
- A charge is settled by one payment or by two installments. A third payment is
  refused, and a payment cannot exceed the remaining balance (ADR-0026).
- A charge with no payment can be deleted. A charge with a payment cannot
  (ADR-0026).
- `(tenancy_id, period_start)` is unique, so a repeated renewal cannot
  double-charge (ADR-0026).
- No deposit is collected, returned, or withheld (ADR-0023).
- A payment is voided with a reason, never edited or deleted (ADR-0022).
- A due date defaults to the period start and stays editable. Overdue is derived
  from the due date and today, never stored (ADR-0013).
- A receipt is one per payment, rendered on demand, idempotent, and desktop only
  (ADR-0016).
- Public pages never show tenant data, in any field (ADR-0019).
- The enquiry form writes nothing to the database (ADR-0014).
- Page prose is Markdown. Raw HTML renders as text (ADR-0024).
- Gallery images upload from the browser, are resized to 1600 px before upload,
  and live in R2 (ADR-0025).
- The property identity comes from `settings` (ADR-0020).

## Build order

1. Scaffold with pnpm, TanStack Start, the Cloudflare plugin, Tailwind, and
   shadcn/ui. Create and bind D1 and R2. Write the schema and the migrations,
   including the partial unique indexes. Build the Pengaturan screen. Deploy the
   skeleton behind Access.
2. Rooms and room types.
3. Tenants and tenancies, with renewal, room move, and move-out.
4. Charges and payments.
5. Dasbor.
6. Halaman editor with preview, gallery upload, landing page, room list, and the
   WhatsApp enquiry form.
7. Kuitansi rendering, when the receipt template arrives.

## Admin screens

Dasbor, Kamar, Tipe Kamar, Penghuni, Sewa, Tagihan, Pembayaran, Halaman,
Galeri, Pengaturan. Kuitansi joins them in step 7.

## Open questions

None. The interview is closed.
