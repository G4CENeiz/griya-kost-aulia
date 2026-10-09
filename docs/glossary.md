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
| Batal | void | A payment that is cancelled and kept, with a reason. Never edited. The void is the soft delete of a payment (ADR-0022, ADR-0036). |
| Kuitansi | `receipt` | The PDF proof of one payment, with a unique number. |
| Nomor kuitansi | `receipt.number` | The unique number of a receipt, assigned when the receipt row is created. |
| Terbilang | amount in words | The amount written out in Indonesian, printed on the receipt. |
| Dana jaminan | — | Not used. No deposit is collected (ADR-0023). |
| Hapus | soft delete | Hiding a record: it leaves every list and every balance, and `deleted_at` holds the time. It is the default delete (ADR-0036). |
| Sampah | trash | The section of a screen that lists its hidden records, with Pulihkan and Hapus permanen. There is no global trash screen. |
| Pulihkan | restore | Clearing `deleted_at`, so the record returns to every list and balance. |
| Hapus permanen | permanent delete | Removing the row. It is refused while a row still refers to the record, and it frees a unique value (ADR-0037). |
| Lihat | item view | The individual view of one record: the record itself and the rows that refer to it. |
| Halaman | `page` | A public page: a slug, a title, a Markdown body, and a published flag. |
| Isi halaman | `page.body_markdown` | The page text, written in Markdown. The app places it between the room list and the gallery. |
| Markdown | — | Plain text with symbols for headings, lists, bold, and links. Raw HTML renders as text, never as markup (ADR-0024). |
| Galeri | `page_images` | Images uploaded for a page and stored in R2, with alt text and a position (ADR-0025). |
| Pengaturan | `settings` | The property identity row: name, tagline, address, WhatsApp number, and bank account (ADR-0020). |
| Dasbor | dashboard | The admin home screen: room counts, charges due, unpaid charges, and recent payments. |
| Ketersediaan | availability | The count of rooms with status `available`, grouped by room type. |
| Pesan minat | enquiry | A visitor message from the public page, handed to WhatsApp. Never stored (ADR-0014). |

## Pages and environments

| UI label | Code name | Definition |
|----------|-----------|------------|
| Beranda | `home` | The landing page at `/`. It is the only page with the room preview. |
| Daftar kamar | `rooms` | The public page that lists every room with search and filters. |
| Kamar | `room` | The public page of one room, at `/kamar/<number>`. |
| Aturan | `rules` | The house-rules page. |
| FAQ | `faq` | The page of questions and answers. |
| Kontak | `contact` | The page with the address, the map link, the bank details, and the enquiry form. |
| Halaman lain | `page` | Any other page the owner adds at `/<slug>`. It gets the generic shell. |
| Susunan | `layout` | The fixed arrangement of one public page. The app owns it; the owner cannot move a section. |
| Pratinjau | preview | The real public route, rendered beside the editor with the unsaved values. |
| Bilah samping | `sidebar` | The vertical navigation rail of the admin area. |
| Lingkungan | `environment` | One Worker with its own database and bucket: staging or production. |
| Pratinjau build | preview URL | The disposable address of a `dev` build. It holds none of the real records. |
