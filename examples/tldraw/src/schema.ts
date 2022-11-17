import { schema, collection } from '@lo-fi/web';

const page = collection({
	name: 'page',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: 'default',
		},
		version: {
			type: 'number',
		},
		shapes: {
			type: 'map',
			values: {
				type: 'any',
			},
		},
		bindings: {
			type: 'map',
			values: {
				type: 'any',
			},
		},
		assets: {
			type: 'map',
			values: {
				type: 'any',
			},
		},
	},
});

export default schema({
	version: 1,
	collections: {
		page,
	},
});
