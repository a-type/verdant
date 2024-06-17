---
sidebar_position: 9
---

# Efficiency & Performance

Since local-first naturally overlaps with the realtime-collaboration space, you'll probably see a lot of talk about performance in this space. Many tool builders are very proud of their 60+fps realtime performance (and they should be, it's impressive)!

I'm afraid I can't reliably boast that with Verdant, which you should know if low-latency realtime collaboration is important to you. But let me explain why...

## Efficiency

"Performance" is the word that gets the most visibility, I think, but Verdant often prioritizes efficiency over performance. I'm not suggesting that these are diametrically opposed, but there _are_ cases where one must be traded off for the other. This might be more clear if I define "efficiency" as I mean it.

"Efficiency" is optimizing for use of available resources across any number of domains. CPU efficiency is often directly correlated to the user's experience of "performance," as in, the app responds faster to input or drops fewer frames. But there are other efficiency targets to worry about: memory is a famously oppositional one to CPU, for example. Often when optimizing for speed, we load more data into memory. Network is another efficiency domain, as is storage.

Verdant is designed to attempt to balance efficiency goals across all of these domains in a way that avoids problematic inefficiencies in any one in particular. For the record, I think it might struggle more on the memory aspect, but I hope this can continue to improve.

## Efficiency tradeoffs in Verdant

### Storage

To make efficient use of on-device and on-server storage, Verdant uses "rebasing." An advantage of using server is we can rely on that server as the 'source of truth' for the state of synced replicas. When Verdant's server detects that all active replicas have seen a change, it 'applies' that change onto a 'baseline,' flattening the history, and informs all replicas it's safe for them to do the same thing. The algorithm for determining 'seen' is not as straightforward as you might think, since offline replicas can contribute data from the past when they come online. Verdant takes care of this for you automatically, though, and the system is pretty heavily tested.

What this means is something unique in the world of local-first / CRDTs: _conflict-free data storage doesn't grow monotonically, either on-device or on the server_. In fact, if all replicas are frequently coming online to sync changes, the ideal state is that storage size is linear to the size of the actual data represented, basically `n + m` where `m` is some amount of light metadata.

But what it means for you, the app developer, _is that you can run your app indefinitely without having to monitor and continually expand your server's storage volume._ It also means you probably don't have to worry about partial sync, which is good, because Verdant doesn't support it. Whether or not this is a problem for you will depend on whether all of the data a user needs to interact with can fit in the storage allotted to the app by the browser. [For most environments this storage limit is practically limited only by the user's hard drive space](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

So, Verdant may not seem as future-proof or technically impressive as other systems which support partial sync, but that's because it's engineered to avoid the problem altogether (which also makes using it simpler).

Oh, and if your client never syncs to a server at all, this rebasing happens automatically on-device, so local-only clients are always maximally storage-efficient.

### Network

As previously noted, one thing many other frameworks are able to brag about is latency in realtime scenarios. Changes are broadcast instantly over the network, allowing users to collaborate on whiteboards or documents as if they were on the same computer. It's very cool, but Verdant isn't quite tuned to do this... at least by default.

Instead, Verdant prioritizes _network efficiency_ by default. Consider what happens if you drag a box on a whiteboard at 60fps in a realtime system. At minimum, to achieve that performance, your replica would be broadcasting 60 changes per second to the network. In many systems, that also means it's persisting 60 operations per second to its local database, the server, and peer replicas. And as previously discussed, that often also means those 60 changes per second are retained indefinitely!

Granted, these would be very small changes, akin to `{ set: 'x', value: 103.5 }`. And tools often use techniques for efficient compression and storage of these both on network and disk. I'm not saying this is bad.

But with Verdant I've opted for something a bit more efficient by default, just in case. Most changes don't need to be 60fps. Often only one replica is modifying the system at a time, in which case all that granularity is completely redundant.

What Verdant does under the hood is _batch and overlay changes_. Any changes you make to an object are synchronously applied in-memory across all references to that object in your app, so you get the immediacy of in-memory plain-JS objects for local use. However, this immediacy gets slowed down before those changes are either persisted to storage or sent to sync. Immediate, synchronous, "60+fps" changes are batched, with a rolling window, before that happens. And before the batch is 'committed,' it runs an algorithm to 'overlay' redundant changes, further compressing the total changes applied. To explain what that means, let me use an example...

Suppose you were indeed moving a box across a whiteboard, diagonally. At 60fps (or however often your drag events emit), Verdant is applying changes to your box's object:

```
-- frame 1
{ set: 'x', value: 5 }
{ set: 'y', value: -30 }
-- frame 2
{ set: 'x', value: 6 }
{ set: 'y', value: -29.9 }
...
-- frame 50
{ set: 'x', value: 204 }
{ set: 'y', value: 165.3 }
```

And so on. These changes are applied synchronously in-memory to keep your interaction snappy. However, they're also fed into the batching system. The default batching heuristics aren't guaranteed (I might tweak them) but let's say for this example they're something like: 1s or 100 changes, whichever comes first.

In that case, once one of those conditions are met, the batch is 'committed,' which means it's flushed to both local storage and sync (if connected). Before it's flushed, the 'overlay' algorithm runs over the whole batch to drop 'superseded' changes. In this example, we're setting the `x` and `y` keys repeatedly. Only the latest of those changes will actually affect the final state of the object; all the rest are superseded. Suppose we hit the 100 change limit for the batch (at 60fps, with 2 changes per frame, that would only take less than a second). After the 'overlay' algorithm runs during batch commit, the batch shown above would be reduced to just two operations:

```
{ set: 'x', value: 204 }
{ set: 'y', value: 165.3 }
```

These are the only two operations out of the 100 we applied in-memory which will be stored in our database and broadcast to sync.

This is a nice win for storage and network efficiency, but it has clear tradeoffs with realtime latency! Because we batched up to 100 changes, we waited nearly 1 second before sending the next 'frame' of interaction to peers. Rather than a 16.6ms framerate (60fps), our ping is more like 833.3ms! Plus network latency, that's no good for highly interactive scenarios.

Luckily, we can adjust the batching behavior, even for individual parts of the app. This isn't very well documented, but it looks like this:

```ts
client.batch({ batchName: 'canvas-changes', max: 50, timeout: 20 }).run(() => {
	box.update({ x, y });
});
```

Using `batchName`, we create a persistent, shared batch with particular configuration for limits. We can run all changes to canvas objects inside batches with the `'canvas-changes'` name to forward them all to the same batch with specified timing.
