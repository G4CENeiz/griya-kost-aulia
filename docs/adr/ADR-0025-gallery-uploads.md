# ADR 0025: Gallery images upload from the browser to R2

- Status: Accepted
- Date: 2026-10-06

## Context

The gallery needs real images, and the owner wants the upload path built, not
only placeholders. Source photos come from a phone camera and are several
megabytes each. Serving half a dozen of those on a landing page is slow, and no
server-side image library runs in a Worker.

## Decision

- The Halaman screen has a Galeri card: select images, see thumbnails, reorder,
  and delete.
- The browser resizes each image to at most 1600 px on the long edge and encodes
  WebP before upload. Nothing larger ever reaches the server.
- The server stores the file in R2 and inserts a `page_images` row with the
  object key, the alt text, and the position.
- An empty gallery renders neutral placeholder blocks. No placeholder image
  files are committed.
- Images are public-read. Gallery keys are not secret.

## Consequences

- R2 holds both receipt PDFs and gallery images, under separate key prefixes.
- No image processing dependency and no Cloudflare Images subscription.
- An iPhone HEIC file depends on browser support for decoding it in a canvas.
  Gate the upload on the decoded result and show a message if a file cannot be
  read.
- Deleting an image removes the row and the object. A failure between the two
  leaves an orphan object. A later cleanup can sweep keys with no row.
