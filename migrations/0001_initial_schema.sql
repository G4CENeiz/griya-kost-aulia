-- Griya Kost Aulia: initial schema.
--
-- Two kinds of time value live here, and they are stored differently.
--
--   * An instant (created_at, updated_at, issued_at, rendered_at, voided_at) is
--     an integer count of epoch milliseconds in UTC, as docs/SPEC.md requires.
--   * A calendar day (start_date, move_out_date, period_start, period_end,
--     due_date, date) is ISO 'YYYY-MM-DD' text. A rental period is a day on a
--     calendar, not an instant, and text keeps it from drifting across the
--     UTC offset when the UI renders it for the Indonesian locale.
--
-- Money is a whole number of rupiah. There are no cents and no fractional
-- amounts anywhere in the model.

PRAGMA foreign_keys = ON;

-- A class of rooms. It carries the description and the facility list; the
-- price lives on the room (ADR-0018).
CREATE TABLE room_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  -- A JSON array of facility names, for example ["AC", "Lemari"].
  facilities TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(facilities)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- One physical rentable unit. `number` is what the tenant and the public list
-- show. `is_unavailable` is the part of the room status the admin sets; the
-- glossary derives the third value, occupied, from the active tenancy
-- (glossary.md, ADR-0019).
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  room_type_id INTEGER NOT NULL REFERENCES room_types (id),
  floor INTEGER NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  is_unavailable INTEGER NOT NULL DEFAULT 0 CHECK (is_unavailable IN (0, 1)),
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX rooms_room_type_id_index ON rooms (room_type_id);

-- A person who rents a room.
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  identity_number TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- One row per stay (ADR-0004). An empty move_out_date means the tenancy is
-- active. The term has no column of its own; the charges carry it.
CREATE TABLE tenancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms (id),
  tenant_id INTEGER NOT NULL REFERENCES tenants (id),
  start_date TEXT NOT NULL,
  move_out_date TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  CHECK (move_out_date IS NULL OR move_out_date >= start_date)
);

-- One active tenancy per room and one per tenant (ADR-0012).
CREATE UNIQUE INDEX tenancies_active_room_unique
  ON tenancies (room_id)
  WHERE move_out_date IS NULL;

CREATE UNIQUE INDEX tenancies_active_tenant_unique
  ON tenancies (tenant_id)
  WHERE move_out_date IS NULL;

CREATE INDEX tenancies_room_id_index ON tenancies (room_id);
CREATE INDEX tenancies_tenant_id_index ON tenancies (tenant_id);

-- An amount owed for one payment period of a tenancy. Creating a tenancy
-- creates all of its charges (ADR-0013). The unique pair on
-- (tenancy_id, period_start) makes renewal safe to retry (ADR-0026).
CREATE TABLE charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenancy_id INTEGER NOT NULL REFERENCES tenancies (id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  due_date TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (tenancy_id, period_start),
  CHECK (period_end >= period_start)
);

-- Money received. A payment is voided with a reason, never edited or deleted
-- (ADR-0022). Every balance ignores rows with a voided_at.
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charge_id INTEGER NOT NULL REFERENCES charges (id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer')),
  note TEXT,
  voided_at INTEGER,
  void_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  -- A void has both a time and a reason, or neither.
  CHECK ((voided_at IS NULL) = (void_reason IS NULL)),
  CHECK (void_reason IS NULL OR length(trim(void_reason)) > 0)
);

CREATE INDEX payments_charge_id_index ON payments (charge_id);

-- The PDF proof of one payment. At most one receipt per payment. The number is
-- assigned when the row is created and never changes; the object key is
-- deterministic from it (ADR-0016).
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL UNIQUE REFERENCES payments (id),
  number TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL,
  rendered_at INTEGER,
  object_key TEXT,
  -- A JSON copy of the values the rendered PDF shows, so a reprint matches the
  -- first print.
  snapshot TEXT CHECK (snapshot IS NULL OR json_valid(snapshot)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- The property identity. Exactly one row (ADR-0020). Nullable fields are
-- values the owner has not filled in yet; the UI shows them as unset rather
-- than inventing a value.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  tagline TEXT,
  address TEXT,
  whatsapp_number TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- A public page. The landing page is the row with slug 'home'; the app adds the
-- room list to that one and renders the same shell for every other slug
-- (ADR-0021, ADR-0024).
CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- One gallery image. The object lives in R2 under the gallery key prefix
-- (ADR-0009, ADR-0025).
CREATE TABLE page_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  alt TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX page_images_page_id_position_index
  ON page_images (page_id, position);

-- Seed the one settings row and the landing page, so the admin screens have
-- something to edit and no screen has to special-case an empty table.
INSERT INTO settings (id, name) VALUES (1, 'Griya Kost Aulia');

INSERT INTO pages (slug, title, body_markdown, is_published)
VALUES ('home', 'Beranda', '', 1);
