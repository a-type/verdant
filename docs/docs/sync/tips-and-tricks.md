---
sidebar_position: 11
---

# Tips and tricks for working in distributed systems

After a year or so of building distributed apps on Verdant, here's some tricks I've picked up.

## Using a custom `primaryKey` for 'canonical' documents

**The problem:** You have many replicas writing to the same library, possibly offline, but you want a particular document to _converge_ when they sync together, even if it was created independently on multiple devices.

One intuitive example is if you had a music app and you wanted all creations of the _Rock_ genre to converge into the same Genre object as multiple people add music and categorize it. ([Gnocchi](https://gnocchi.biscuits.club) uses this for Categories and Foods).

Instead of using a generated ID for the primary key, you can define it yourself. Even if multiple clients `.put` the same document with the same ID, they will all end up sharing a history once sync replicates all changes.

However, because of limitations in Verdant's sync design, the last writer will still 'win' and their initial value will overwrite any prior changes, even if those changes included multiple alterations. In practice this doesn't seem to present a huge problem; most of the time replicas are online and will sync the document instead of creating it themselves.
