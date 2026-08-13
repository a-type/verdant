import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				devtools: resolve(import.meta.dirname, 'devtools.html'),
				panel: resolve(import.meta.dirname, 'panel.html'),
			},
		},
	},
});
