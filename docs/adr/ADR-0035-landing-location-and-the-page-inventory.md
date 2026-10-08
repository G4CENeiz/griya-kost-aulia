# ADR 0035: The landing page carries a location section, and the owner picks the rest

- Status: Accepted
- Date: 2026-10-08

## Context

The owner reviewed the new public site and asked for more: a proper landing
page, a room discovery page, a room viewing page, information pages, and "a
section in the landing to show my address in google map", plus other things he
listed as examples to choose from.

Two constraints shape the answer.

A map needs a place, and the app stores an address, not coordinates. The Google
Maps Embed API needs an API key and a billing account, which is an owner-level
decision. The legacy embed endpoint at `maps.google.com/maps?q=...&output=embed`
needs no key and geocodes the address itself, at the cost of being undocumented.

The other constraint is content. Every page the owner adds is prose he has to
write. Five pages with real words beat twelve with a placeholder on each.

## Decision

- The landing page gains a **location section**: the address, an embedded map,
  a button that opens Google Maps, and a short wayfinding note. The map is the
  legacy key-free embed until the owner supplies an API key, and the key, if it
  comes, is an environment variable and not a repository value.
- The landing page also gains an **availability table**: the rooms with their
  type, price, and status, and a link to the discovery page.
- The built-in pages of ADR-0031 stay: Beranda, Daftar kamar, Kamar, Aturan,
  FAQ, Kontak.
- The further pages and landing sections the owner may add are recorded as an
  inventory in `docs/NOTES.md`. Nothing is built from that list until the owner
  names it, and each page that is built must carry real prose.
- The room discovery page gains sorting and a price range, because a visitor
  comparing rooms asks for both.

## Consequences

- The address on the site is a place a visitor can act on, not a line of text.
- The owner chooses the site's size from a written list, so a page is never
  built twice or built by guess.
- An API key for the supported Embed API is a later swap of one URL, and the
  section does not change.
