import { schema } from '@verdant-web/common';

export const people = schema.collection({
	name: 'person',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		name: {
			type: 'string',
			indexed: true,
		},
		posts: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
	},
});
