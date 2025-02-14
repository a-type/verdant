---
sidebar_position: 5
---

# CLI

Verdant has a CLI which is vital for generating client typings and upgrading your schema over time. You could theoretically do these things by hand, but it would be really complicated and type safety would be basically infeasible.

The CLI generates client code which you **should commit to version control.** This code is vital to your app.

The CLI generates:

- A client with your schema pre-loaded
- Strong typings for all your documents in your schema, and index filters for queries against those documents.
- Migrations to go from one schema version to the next.
- React hooks and associated typings, if you choose.

The generated code also keeps historical versions of every deployed schema. This may seem excessive, but for local-first apps it's actually pretty important and powers migrations.

## How to use the CLI

First, make some changes to your schema file which reflect changes you want to make to your app. I like to use this part of the process to think through how I want my data to work and plan out the features my changes will enable. Kind of like any other database schema work.

Then, run the CLI with `npx verdant -s <path to schema> -o <path to generated output>`. Add `-r` for React code generation, too.

The CLI will analyze your schema and the current state of your app and provide some options:

- Start a new WIP schema with your schema changes and version N + 1
- Publish a new schema (from an existing WIP schema, or directly from new schema changes without a WIP phase) that's ready to deploy
- Just regenerate client code (useful when upgrading the CLI, this can fix bugs in generated code or add new features)

Hopefully the process is guided enough to not require too much additional explanation.

## WIP Schemas

One feature the CLI provides is iterating on schemas in "WIP" mode. This lets you make temporary changes to a schema when developing on your local device in order to test functionality. Before you deploy your app, you will need to mark your schema as production-ready.

When using a WIP schema, a copy is made of your app data and moved into a temporary database. All your changes you make while testing will be applied on that copy of data. Sync is turned off, even if it's enabled in your development environment, because syncing changes made against a schema you may not end up using will introduce permanent invalid changes to your stored data on the server and other clients. There are ways I could make sync work with WIP schemas, but for now I haven't pursued them. Reach out if you find sync or multiplayer necessary to test your new schema locally. It's likely I will too at some point, just not yet.

### Verifying your schema for deployment

It's important you don't deploy and use a WIP schema. If you do, any changes users make against that schema will be in a temporary copy of the database, just like local development, and so they'll be lost by the time you correct your mistake.

To help avoid this and other problems, Verdant has a `verdant-preflight` CLI tool to validate your code before a deployment. Incorporate this into your testing suite, CI, PR approval process, or just before your final build and deploy. It will fail if any of these conditions are true:

- Your client schema is WIP
- Your schema doesn't match what's preloaded in your generated client (client is out of date)
- You don't have a migration for your current schema version

To use the preflight check, run the CLI with the `preflight` command:

```
verdant preflight -s <path to schema> -o <path to output> -m <path to migrations>
```

## Upgrading

For anyone using Verdant before CLI v4 (probably nobody but me), you'll need to actually upgrade a lot of your generated client code before using the new CLI, including rewriting all historical schemas and changing some migration tool usage.

It's possible this upgrade (which runs automatically when you run the CLI) will fail. In that case, get in touch on Github and we can debug.

For any newcomers, please just use CLI > v4. It's much better and enables some key schema features in recent Verdant versions.
