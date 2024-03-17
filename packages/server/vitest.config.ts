import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		clearMocks: true,
		environment: 'node',
	},
	resolve: {
		conditions: ['development', 'import'],
	},
	build: {
		sourcemap: true,
	},
});
