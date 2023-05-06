---
sidebar_position: 2
---

# Protocol assumptions

Collecting some thoughts about assumptions made in Verdant's sync protocols. May format this to be more readable at some point, but for now it's mostly for me (doubt you're considering implementing your own replica client).

A replica always does a `sync` exchange (`sync`, `sync-resp`, `sync-ack`) before sending any other messages (with the exception of `presence-update` which may be sent in parallel)

Every operation which arrives to the server is guaranteed to be earlier in timestamp than any subsequently sent operations. In other words, replicas ensure operations are sent in time order, whether they be in `sync` or `op` messages. Hence always `sync` before sending any `op`s. Internal client batching behavior must also account for this (in the client this is ensured by rewriting outgoing operation timestamps to `now` before flushing a batch)
