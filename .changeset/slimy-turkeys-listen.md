---
'@verdant-web/common': patch
'@verdant-web/react': patch
'@verdant-web/store': patch
---

[React] useWatch and useOnChange are now exported bare from the library, allowing use without calling createHooks(). [Store/Common] Field defaults for array and map fields are now partially supported. Typescript does not like them.
