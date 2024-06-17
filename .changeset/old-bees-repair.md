---
'@verdant-web/react': minor
'@verdant-web/store': minor
---

Fixed some big performance gaps in React hooks - query hooks no longer refresh queries on each render! Also dramatically reduced the number of times a query emits 'change' events to match only changes in the identities of returned documents, as designed, by fixing a mistake in change notification logic. Combined, these drastically improve performance in apps with frequent or real-time changes!
