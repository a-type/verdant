---
'@verdant-web/common': major
'@verdant-web/server': major
'@verdant-web/cloudflare': minor
'@verdant-web/store': minor
'@verdant-web/s3-file-storage': patch
'@verdant-web/tiptap': patch
'@verdant-web/cli': patch
---

Complete refactor of server to support more runtimes. This fundamentally changes how Verdant server is constructed and used in Node, and adds a Cloudflare binding.

## Breaking changes

- New, rewritten Node bindings and initialization procedure. See docs.
- **Removed:** Unified SQL storage. Only sharded SQLite storage is supported.
- How Node sync servers interact with libraries has changed. See docs.

## Internal changes

These shouldn't affect user code but do require updating client/server in tandem.

- Heartbeat payload is simplified to just `type`.

## New: Cloudflare

Verdant now has experimental support for Cloudflare stacks, using Durable Objects to represent individual Verdant libraries.

This always seemed like a good fit, but the effort of refactoring required to adapt to a very different backend architecture meant it's been a long time coming.

Cloudflare bindings pass the same extensive integration test suite as the original Node bindings, 1:1. This gives some real confidence in stability, but for the time being they remain `0.1` until proven in production.

## Other things

The main integration test suite has been rewritten from JSDOM and now uses Vitest Browser Mode, to provide even more reliability that Verdant works in real browsers. The tests are also faster now!
