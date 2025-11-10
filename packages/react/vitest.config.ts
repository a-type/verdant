import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	test: {
		include: ['src/**/*.test.tsx'],
		browser: {
			provider: playwright(),
			enabled: true,
			instances: [
				{
					browser: 'chromium',
					headless: true,
				},
			],
		},
		clearMocks: true,
	},
	resolve: {
		conditions: ['development', 'default'],
	},
});
