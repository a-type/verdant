import { schema, collection } from '@lo-fi/web';

const items = collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		content: {
			type: 'string',
			default: '',
		},
		done: {
			type: 'boolean',
			default: false,
		},
	},
});

export default schema({
	version: 1,
	collections: {
		items,
	},
});
