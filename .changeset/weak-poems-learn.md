---
'@verdant-web/common': minor
'@verdant-web/server': minor
'@verdant-web/react': minor
'@verdant-web/store': minor
'@verdant-web/react-router': patch
---

Add "internal" presence concepts which use presence machinery to power built-in features. Starting with "view ID" which encodes the 'view' the user is looking at, further refining presence peer relationships for apps with multiple distinct views. This version also adds a cleanup callback to the router's route onVisited callback.
