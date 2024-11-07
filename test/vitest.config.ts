import { defineConfig } from 'vitest/config';

export default defineConfig((c) => ({
	test: {
		// environment: process.env.SQLITE ? 'node' : 'jsdom',
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['setup/indexedDB.ts'],

		testTimeout: 30000,
	},
	resolve: {
		conditions: ['development', 'default'],
	},
}));
