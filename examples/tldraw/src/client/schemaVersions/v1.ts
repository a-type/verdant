import { schema, collection } from '@lo-fi/web';

const pages = collection({
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
				type: 'object',
				properties: {
					type: {
						type: 'string',
					},
					size: {
						type: 'array',
						items: {
							type: 'number',
						},
					},
				},
			},
		},
	},
});

const assets = collection({
	name: 'asset',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
		},
		file: {
			type: 'file',
		},
	},
});

export default schema({
	version: 1,
	collections: {
		pages,
		assets,
	},
});
