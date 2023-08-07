---
'@verdant-web/react': major
---

Provider no longer has an internal suspense boundary. You must wrap your Provider in your own Suspense. This gives you more control over loading behavior at the cost of a slight initial bump of having to understand Suspense, which the React Verdant bindings kind of require anyway.
