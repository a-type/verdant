import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		browser: {
			provider: 'playwright',
			enabled: true,
			// headless: true,
			instances: [
				{
					browser: 'chromium',
				},
			],
		},
		deps: {
			optimizer: {
				web: {
					exclude: [
						'@verdant-web/store',
						'@verdant-web/common',
						'@verdant-web/react',
					],
				},
				ssr: {
					exclude: [
						'@verdant-web/store',
						'@verdant-web/common',
						'@verdant-web/react',
					],
				},
			},
		},
		clearMocks: true,
	},
	optimizeDeps: {
		exclude: [
			'@verdant-web/store',
			'@verdant-web/common',
			'@verdant-web/react',
		],
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
