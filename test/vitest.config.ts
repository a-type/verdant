import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					environment: 'jsdom',
					clearMocks: true,
					setupFiles: ['setup/indexedDB.ts'],
					globalSetup: ['setup/server.ts'],
					testTimeout: 30000,
					name: 'Hono',
					env: {
						NODE_ENV: 'test',
						TEST_MODE: 'hono',
					},
				},
			},
		],
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
