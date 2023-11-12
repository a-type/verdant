---
'@verdant-web/react': minor
'@verdant-web/store': minor
---

Updated how plural names are used in collections. If you've named your collection keys as the plural, this won't affect you. However, if your collections were keyed by something that didn't match with your plural name, the names of the keys you use to access queries and of your generated React hooks will change.

To migrate, remove all `pluralName` usage in your schema, and assign your collections to the plural name of your model in the `collections` part of your schema.
