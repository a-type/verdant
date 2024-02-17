---
'@verdant-web/react-router': minor
---

Fix various router problems. Router onNavigate now accepts full location as first parameter (breaking change). Fixed links going to stale locations if to prop changed. Fix scroll resetting on search param change. Fixed scroll jumping to 0 during a suspense route transition.
