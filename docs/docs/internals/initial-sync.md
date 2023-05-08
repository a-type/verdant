---
sidebar_position: 1
---

# Initial sync

When a replica comes online, it must exchange information with the server until they share a common understanding of the operation history of the library in question.

A naive approach would be to have the replica send over any changes it made since the last time it saw the server, and for the server to respond with any changes it received in the same time interval. And this, in fact, gets us very far.

However, there are a few contingencies to consider which require more robust protocols. In fact I'm writing this document to define and explore those before implementing said protocols, as a thought exercise.

## A replica is not the first to initialize a new library

Suppose replicas A and B are both attempting to sync, for the first time, to a brand new Library 1. A gets there first, so the server receives and copies A's local history into its own database.

When B arrives, what should happen? B and A have entirely separate and theoretically irreconcilable histories. We could _attempt_ to merge them, but Verdant's assumption is that this could cause more harm than good.

Instead, the server will ignore B's incoming data and respond with its full storage, instructing B to reset its local state instead.

This means that if you write an app which optimistically chooses a library ID and tries to push local data to that library, it may end up with all your local data being lost!

Instead, joining a library should be a very explicit action that the user consents to, and your app should be designed such that the only the first user to be given access to a library is under the assumption their data will be utilized. Subsequent joiners should be informed that their local changes will be lost.

## A replica goes "truant" and then reconnects

This is actually the same as the previous case! A replica used to be part of a library but hasn't been seen in so long that the server has kicked it out. When it reconnects, local changes are forfeit.

## A replica has lost its local data store

In theory, we'd see this crop up if the user cleared site data - like, the server would think it's seen the replica before, and only catch it up on recent changes, leading to incomplete history.

However, it doesn't actually happen, because the replica ID is also stored alongside operations and baselines. So when a user clears the storage, the replica reconnects as a new identity, and receives the full history in return.
