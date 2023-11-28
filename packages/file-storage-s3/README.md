# verdant server

This server is designed to sync data from clients. That includes replication between clients and realtime updates, including presence.

The server includes flexibility of transport - using either websockets or push/pull HTTP requests. To do this cleanly, the concept of a `clientKey` is employed. Each client connection (socket or individual request) is assigned a key and added to a collection (based on its associated library). When the server responds to a client, abstractly, it submits that response to the client's key. The connection management code then either sends that response as a socket message, or includes it in the HTTP response.
