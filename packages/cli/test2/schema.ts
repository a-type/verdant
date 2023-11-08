import { schema } from '@verdant-web/common';
import { todos } from './todos.js';
import { people } from './people.js';
import { posts } from './posts.js';

export default schema({
	version: 2,
	collections: {
		todos,
		people,
		posts,
	},
});
