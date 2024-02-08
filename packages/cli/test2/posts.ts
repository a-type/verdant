import { schema } from '@verdant-web/common';

export const posts = schema.collection({
	name: 'post',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		title: {
			type: 'string',
			indexed: true,
		},
		content: {
			type: 'string',
		},
	},
});
