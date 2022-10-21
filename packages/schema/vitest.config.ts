import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['test/setup/indexedDB.ts'],
	},
});
