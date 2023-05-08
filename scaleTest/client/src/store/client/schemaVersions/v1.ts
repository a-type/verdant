import { schema, collection } from '@verdant-web/store';
import cuid from 'cuid';

const item = collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => cuid(),
		},
		done: {
			type: 'boolean',
			default: false,
		},
		name: {
			type: 'string',
			default: '',
		},
		categoryId: {
			type: 'string',
			nullable: true,
		},
	},
	synthetics: {
		doneIndex: {
			type: 'boolean',
			compute: (item) => item.done,
		},
	},
});

const category = collection({
	name: 'category',
	primaryKey: 'id',
	pluralName: 'categories',
	fields: {
		id: {
			type: 'string',
			default: () => cuid(),
		},
		name: {
			type: 'string',
		},
	},
});

export default schema({
	version: 1,
	collections: { item, category },
});
