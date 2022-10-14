import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		clearMocks: true,

		setupFiles: ['src/v2/__tests__/setup/indexedDB.ts'],
	},
});
