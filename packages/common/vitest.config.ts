import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		clearMocks: true,
		environment: 'jsdom',
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
