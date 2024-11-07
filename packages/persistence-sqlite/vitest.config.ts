import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['src/__tests__/setup/indexedDB.ts'],
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
