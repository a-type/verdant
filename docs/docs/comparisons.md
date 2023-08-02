---
sidebar_position: 8
---

# Comparisons to other local-first tools

Local-first is pretty new on the web, so it makes sense you'd want to choose carefully when adopting technologies. Clear mass-adoption winners haven't really emerged yet, and tradeoffs are everywhere.

So here's an attempt at a concise and honest summary of tradeoffs in Verdant. Obviously I'll have some bias toward my framework, but really, I built Verdant for me and it doesn't bother me much if you choose something else, so I think you'll find I'm being pretty candid here.

## Local storage tradeoffs

Verdant prioritizes:

- ⭐ Limiting storage usage over time: old changes are compressed and dropped
- ⭐ Future-proofing and flexibility: [Migrations](./local-storage/migrations.md)
- Safe data usage: [Schemas](./local-storage/schema.md)
- Out-of-the-box usage: start storing and querying immediately, no choices to make about persistence layers or conflict resolution choices
- Document-based data: no formal relations between objects, but deep nested objects is encouraged

Those marked with a ⭐ are choices I think are particularly unique at time of writing in this space. I'm not aware of any other conflict-avoidant, syncing storage which doesn't monotonically grow utilized storage space on-device over time, and I'm aware of very few other solutions for local-first data storage which focus on migrating data as the app changes (for others, see [ElectricSQL](https://electric-sql.com/docs/usage/migrations) and [VLCN](https://vlcn.io/docs/cr-sqlite/migrations), but IMO neither of these is as easy as Verdant, yet).

Verdant *de*prioritizes:

- ⚠️ Query speed: IndexedDB is slow and Verdant isn't particularly optimized, either.
- Storage adaptability: No alternate persistence options, plugins, or functionality 'hooks.'
- Complex queries: only index-based queries are supported, there's no SQL or even a rudimentary dynamic query language. You can do complicated queries, but you'll need to write complicated indexes to make that work. Verdant will eventually force you to do advanced filtering in-memory on a larger result set (remember, all data is already local).

### You might like these if:

You're worried about local-first deployment and how it might restrict your ability to pivot your approach to app features or data model in the future while maintaining user data on their devices

### You might dislike these if:

Your app has any specific performance needs (like 60fps multiplayer) and you're not able to rely on technical work-arounds (like pre-loading queries) and slight-of-hand (like cursor interpolation).

You really like SQL and relational models. Although, let me say, I do too... but I found for local-first, documents are actually fairly nice to work with.

## Sync tradeoffs

Verdant prioritizes:

- Working on your existing server infrastructure (provided it's NodeJS lol)
- Extreme simplicity of deployment model: 1 server, SQLite database
- Versatility of network transport: polling or websockets

Verdant *de*prioritizes:

- ⚠️ Horizontal scaling. User storage libraries would have to be sharded to fit on specific servers. Servers can't talk to one another today.
- Performance: I haven't scaled anything up much on Verdant so I don't know how many users will fit on a server. I'll probably improve this over time if any of my apps get more users.
- Variability of storage: you only get to choose where the SQLite database goes. Can't be integrated into another database, can't use Postgres, etc.

### You might like these if:

You already have a Node server and don't want to have to set up much to get started with sync. Or, generally, if you're more focused on building a product than worrying about sync protocols and storage backends.

### You might dislike these if:

You've got strong opinions about backend systems and databases, or use another language for your backend.

Or, if you won't want to host any backend at all (Verdant has no cloud offering).
