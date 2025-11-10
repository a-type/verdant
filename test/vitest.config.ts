import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{
					browser: 'chromium',
					headless: true,
				},
			],
			connectTimeout: 10_000,
			isolate: true,
			screenshotFailures: false,
			// headless: true,
		},
		clearMocks: true,
		setupFiles: ['setup/client.ts'],
		globalSetup: ['setup/server.ts'],
		testTimeout: 20000,
		// testNamePattern: /.*\.test\.ts/,
		projects: [
			{
				extends: true,
				test: {
					name: { label: 'hono', color: 'cyan' },
					env: {
						NODE_ENV: 'test',
						SERVER: 'hono',
					},
				},
			},
			{
				extends: true,
				test: {
					name: { label: 'cf', color: 'yellow' },
					env: {
						NODE_ENV: 'test',
						SERVER: 'cloudflare',
					},
				},
			},
		],
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
