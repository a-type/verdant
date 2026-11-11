---
'@verdant-web/store': patch
---

Recover closed realtime sync sockets when the app returns to the foreground, the network comes online, or a periodic connection check finds a missed reconnect. Avoid token errors when local changes occur while realtime authentication is pending.
