import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		clearMocks: true,
		environment: 'node',
		dir: 'src',
	},
	resolve: {
		conditions: ['development', 'default'],
	},
	build: {
		sourcemap: true,
	},
});
