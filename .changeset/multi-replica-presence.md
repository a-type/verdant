---
'@verdant-web/common': minor
'@verdant-web/server': minor
'@verdant-web/cloudflare': minor
'@verdant-web/store': minor
---

Presence now tracks all recently active replicas for each user (`UserInfo.replicaIds`), so multiple devices for the same user correctly upgrade from polling to WebSockets. The client's `selfReplicaIds` is rebuilt from server data so devices which leave are forgotten, and clients downgrade back to polling when they are alone. Push/pull clients also receive current presence in operation acknowledgements, letting them discover peers as soon as they make changes. Global ack consensus now considers every active replica of a user.
