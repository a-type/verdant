import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['setup/indexedDB.ts'],

		testTimeout: 30000,
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
