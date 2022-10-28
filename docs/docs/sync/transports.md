---
sidebar_position: 6
---

# Advanced: Transports

lo-fi can sync over HTTP requests or WebSockets. By default, it automatically uses HTTP when a user is the only one connected to a library, and switches to WebSockets when other users are online.

You can disable this functionality by passing `sync.automaticTransportSelection: false` to your client descriptor config, and change transport manually by using `sync.setMode('realtime' | 'pull')`.

For reference, the default behavior is to switch to `realtime` whenever presence detects another user, and back to `pull` if everyone else leaves. You could use more advanced logic to streamline your server usage, for example if users are able to view different pages or spaces in your app, you might only turn on realtime if your presence data indicates they are looking at the same stuff.

Switching transports is seamless and will not affect the ability of the user to read or modify data.
