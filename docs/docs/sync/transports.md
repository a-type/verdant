---
sidebar_position: 6
---

# Advanced: Transports

Verdant can sync over HTTP requests or WebSockets. By default, it automatically uses HTTP when a user is the only one connected to a library, and switches to WebSockets when other users are online.

You can disable this functionality by passing `sync.automaticTransportSelection: false` to your client descriptor config, and change transport manually by using `sync.setMode('realtime' | 'pull')`.

For reference, the default behavior is to switch to `realtime` whenever presence detects another user, or another device belonging to the same user (`sync.presence.selfReplicaIds`), and back to `pull` if everyone else leaves. Pass `automaticTransportSelection: 'peers-only'` to ignore the current user's other devices.

Set `realtimeGracePeriod` to control how long, in milliseconds, a connected WebSocket stays open without other relevant replicas before switching to HTTP. The default is 1,000 ms. The timer starts on connection or when the last relevant replica leaves, and is cancelled if another joins. This setting has no effect when automatic transport selection is disabled.

For example, to start with WebSockets and wait 10 minutes before switching to HTTP when alone, configure:

```ts
sync: {
  // ...auth and presence configuration
  initialTransport: 'realtime',
  realtimeGracePeriod: 10 * 60 * 1000,
}
```

The usual presence and `peers-only` rules determine which replicas count. The client upgrades again when it discovers another relevant replica over HTTP. Use `initialTransport: 'pull'` for tokens that do not permit WebSockets.

While using `pull`, a client learns about other users each time it polls. It also gets fresh presence whenever it pushes changes to the server, so it can switch to `realtime` as soon as the user edits something, without waiting for the next poll. You could use more advanced logic to streamline your server usage, for example if users are able to view different pages or spaces in your app, you might only turn on realtime if your presence data indicates they are looking at the same stuff.

Switching transports is seamless and will not affect the ability of the user to read or modify data.
