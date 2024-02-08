---
'@verdant-web/create-app': minor
'@verdant-web/common': minor
'@verdant-web/server': patch
'@verdant-web/cli': patch
---

_New!_ Schema helpers to replace old type-restricted schema objects. Utilize the helpers to get better intellisense and more helpful TS validation in your schema.

```ts
import { schema } from '@verdant-web/store';

const items = schema.collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string({ default: schema.generated.id }),
		obj: schema.object({
			properties: {
				name: schema.fields.string(),
				value: schema.fields.number(),
			},
			default: {
				name: 'hello',
				value: 1,
			},
		}),
	},
});

export default schema({
	version: 1,
	collections: {
		items,
	},
});
```

They may be a little more verbose, but using these wrappers is essential to adding better type validation and other potential features down the line (like typed `any` fields).

Also, `object` field now accepts default. Object defaults recursively apply nested field defaults if present.
