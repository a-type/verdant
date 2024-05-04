---
sidebar_position: 1
---

# Intro to Verdant

An IndexedDB-powered database and data sync solution for lightweight, local-first web apps.

- Uses IndexedDB, already built into your browser (no special WASM stuff to set up)
- One small, generic syncing server is all you need
- Schema-based data migrations that can handle offline clients
- Bring your existing authentication
- Realtime multiplayer with conflict resolution and presence
- Multi-transport syncing with seamless upgrade to and from websockets
- Typescript validation based on your schema
- Advanced index and querying tools built in (advanced for IndexedDB, anyway - we're not talking SQL)
- Reactive data queries
- Automatic history compaction for efficient client storage usage

## Early software

This is a very experimental set of libraries which I'm developing slowly alongside my suite of local-first apps [Biscuits](https://biscuits.club) to suit my [own goals](https://blog.gfor.rest/blog/lofi-intro). The usage and behavior is subject to change, although I will either try to avoid changes that fundamentally change how data is stored, or provide upgrade paths which won't disrupt apps already in use as much as possible.

Documentation will be sparse for a while. If you'd like to see a full-sized example, [Biscuits apps are open source.](https://github.com/a-type/biscuits)

## What is Verdant trying to accomplish?

More than just a software tool for its own sake, I built Verdant for a specific purpose: making sustainable web apps for individual users as a personal, small business.

If you want to read more about how and why, it's in the [manifesto](./manifesto.md). I've always wanted to write a manifesto! That's not too pretentious, is it?

## What's it like to use?

I've recorded myself working on [Gnocchi](https://gnocchi.biscuits.club), one of my Biscuits apps, adding a new feature with Verdant (it used to be called "lo-fi" at the time of recording, but not much has changed in usage).

<iframe width="560" height="315" src="https://www.youtube.com/embed/RUykjG-L8Z4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

I think that gives you a decent overview of how easy it is to use day-to-day.
