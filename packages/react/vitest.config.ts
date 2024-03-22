import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['tests/setup/indexedDB.ts'],
	},
});
