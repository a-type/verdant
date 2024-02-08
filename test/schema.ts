import { schema } from '@verdant-web/store';

const items = schema.collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string({
			default: () => Math.random().toString(36).slice(2, 9),
		}),
		content: schema.fields.string({
			default: '',
		}),
		tags: schema.fields.array({
			items: schema.fields.string({
				options: ['a', 'b', 'c'],
			}),
		}),
		purchased: schema.fields.boolean({
			default: false,
		}),
		categoryId: schema.fields.string({
			nullable: true,
		}),
		comments: schema.fields.array({
			items: schema.fields.object({
				properties: {
					id: schema.fields.string({
						default: () => Math.random().toString(36).slice(2, 9),
					}),
					content: schema.fields.string({
						default: '',
					}),
					authorId: schema.fields.string(),
				},
			}),
		}),
		image: schema.fields.file({
			nullable: true,
		}),
	},
	indexes: {
		categoryId: {
			field: 'categoryId',
		},
		purchasedYesNo: {
			type: 'string',
			compute(item) {
				return item.purchased ? 'yes' : 'no';
			},
		},
	},
});

const categories = schema.collection({
	name: 'category',
	pluralName: 'categories',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string({
			default: () => Math.random().toString(36).slice(2, 9),
		}),
		name: schema.fields.string(),
		metadata: schema.fields.object({
			nullable: true,
			properties: {
				color: schema.fields.string(),
			},
		}),
	},
	indexes: {
		name: {
			field: 'name',
		},
	},
});

export default schema({
	version: 1,
	collections: {
		items,
		categories,
	},
});
