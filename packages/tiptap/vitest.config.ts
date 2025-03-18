import basicSsl from '@vitejs/plugin-basic-ssl';
import viteReact from '@vitejs/plugin-react';
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
	server: {
		https: {},
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
	assetsInclude: ['./src/__browserTests__/fixtures/**/*'],
	plugins: [
		viteReact(),
		basicSsl({
			/** name of certification */
			name: 'test',
		}),
	],
});
