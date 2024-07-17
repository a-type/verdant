---
'@verdant-web/react': minor
'@verdant-web/store': minor
'@verdant-web/cli': minor
'@verdant-web/common': patch
---

## Store

Adds built-in presence features for field presence. Use `setFieldId` to track presence on a field. If using directly, you must decide on a field ID for the field. See React docs for more seamless integration with `useField`.

## React

Adds the `useField` hook. Pass an entity and a key and it gives you a grab bag of all the stuff you need to work with a particular field. See docs for more info.

## Common

Adds the 'id' field type as a shorthand for string type with an id generated default
