# ADR 0010: Receipt PDFs compile in the admin browser

- Status: Accepted
- Date: 2026-10-06

## Context

Typst is a Rust program. A Worker cannot run a program. Typst as WebAssembly
does run in a Worker, in a browser, and in Node. Placement options were the
Worker, the admin browser, and a Cloudflare Container.

Measured constraints:

- The Typst compiler module is about 7.62 MB, plus about 4.42 MB of fonts.
- Workers cap CPU time at 10 ms per request on the free plan and 30 s on the
  paid plan. One receipt compile costs far more than 10 ms.
- Workers cap isolate memory at 128 MB. A Typst compile of one page may fit, but
  this is unproven.
- WebKit gives WebAssembly about 300 MB on iOS, sometimes about 28 MB after
  reloads, and iOS kills the tab under memory pressure. Android Chrome is not
  affected.

## Decision

The admin browser compiles the receipt PDF with Typst WebAssembly, then sends
the bytes to a server route. That route writes the object to R2 through the R2
binding.

## Consequences

- The Worker stays on the free plan and stays small.
- The admin sees the finished PDF before it is stored.
- Receipt generation needs a desktop browser. It is not reliable on iOS.
- Automated verification of a receipt PDF needs a browser test, not a unit test.
  Move compilation to the Worker if receipts must be generated from a phone.
