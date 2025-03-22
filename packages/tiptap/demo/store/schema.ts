import { schema } from '@verdant-web/common';
import {
	createTipTapFieldSchema,
	createTipTapFileMapSchema,
} from '../../src/fields.js';

export default schema({
	version: 1,
	collections: {
		posts: schema.collection({
			name: 'post',
			primaryKey: 'id',
			fields: {
				id: schema.fields.id(),
				nullableBody: createTipTapFieldSchema({ default: null }),
				requiredBody: createTipTapFieldSchema({
					default: {
						type: 'doc',
						content: [],
					},
				}),
				files: createTipTapFileMapSchema(),
			},
		}),
	},
});
