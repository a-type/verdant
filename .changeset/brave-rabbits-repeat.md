---
'@verdant-web/react-router': minor
---

Breaking change to router: [perf] remove onAccessible callback in routes

This feature was simply bad for performance and scalability as the number of routes grew, since each Link had to traverse the entire route tree on mount. This created an exponential slowdown between number of links on the page and number of routes.

If you want to preload data for routes the user may visit from the current page, use `onVisited` on that page and your own judgment on what to preload.
