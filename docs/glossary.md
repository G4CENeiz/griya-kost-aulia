# Glossary

Two vocabularies meet in this project. The UI is Indonesian (ADR-0003). Every
internal name is English: tables, columns, types, functions, and files. This
table maps one to the other. Definitions are short and declarative.

| UI label | Code name | Definition |
|----------|-----------|------------|
| Kamar | `room` | One physical rentable unit. Has a number, a room type, a floor, a price, and a status. |
| Tipe Kamar | `room_type` | A class of rooms, such as Type A or Type B. Carries the description and the facility list. |
| Lantai | `floor` | The building level of a room. Type A prices vary by floor. |
| Harga | `price` | The monthly rent of one room. Fixed, never negotiated (ADR-0012). |
| Status kamar | `status` | `available`, `occupied`, or `unavailable`. Derived from the active tenancy, except for `unavailable`, which the admin sets. |
| Tersedia | `available` | A room with no active tenancy and not held by the owner. |
| Terisi | `occupied` | A room with an active tenancy. |
| Tidak tersedia | `unavailable` | A room the owner withholds from rent, for example during repair. |
| Penghuni | `tenant` | A person who rents a room. Identified by name and WhatsApp number. |
| Sewa | `tenancy` | The association of one tenant with one room, from a start date to a move-out date. One row per stay (ADR-0004). |
| Masa sewa | `term` | A rental block: 1, 3, 6, 9, or 12 months. It has no row of its own. The charges carry it. |
| Mulai sewa | `start_date` | The day the tenancy begins. |
| Tanggal keluar | `move_out_date` | The day the tenancy ends. Empty while the tenant lives there. A tenancy with an empty move-out date is active. |
| Perpanjang | renew | Creating the charges for another term on an existing tenancy. It does not create a tenancy row. |
| Pindah kamar | room move | Ending a tenancy and opening a new one for the same tenant in another room. |
| Tagihan | `charge` | An amount owed for one payment period of a tenancy. |
| Periode | `period` | The span a charge covers, held as `period_start` and `period_end`. One month, or the whole block. |
| Jatuh tempo | `due_date` | The day a charge is due. It defaults to the period start and stays editable. |
| Angsuran | installment | One of up to two payments that settle one charge. |
| Sisa | balance | Charge amount minus the sum of its non-voided payments. |
| Pembayaran | `payment` | Money received against a charge. Has an amount, a date, a method, and a note. |
| Metode | `method` | `cash` or `transfer`. |
| Batal | void | A payment that is cancelled and kept, with a reason. Never deleted or edited (ADR-0022). |
| Kuitansi | `receipt` | The PDF proof of one payment, with a unique number. |
| Nomor kuitansi | `receipt.number` | The unique number of a receipt, assigned when the receipt row is created. |
| Terbilang | amount in words | The amount written out in Indonesian, printed on the receipt. |
| Dana jaminan | — | Not used. No deposit is collected (ADR-0023). |
| Halaman | `page` | A public page: a slug, a title, a Markdown body, and a published flag. |
| Isi halaman | `page.body_markdown` | The page text, written in Markdown. The app places it between the room list and the gallery. |
| Markdown | — | Plain text with symbols for headings, lists, bold, and links. Raw HTML renders as text, never as markup (ADR-0024). |
| Galeri | `page_images` | Images uploaded for a page and stored in R2, with alt text and a position (ADR-0025). |
| Pengaturan | `settings` | The property identity row: name, tagline, address, WhatsApp number, and bank account (ADR-0020). |
| Dasbor | dashboard | The admin home screen: room counts, charges due, unpaid charges, and recent payments. |
| Ketersediaan | availability | The count of rooms with status `available`, grouped by room type. |
| Pesan minat | enquiry | A visitor message from the public page, handed to WhatsApp. Never stored (ADR-0014). |
