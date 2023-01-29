import { defineConfig } from 'vite';
import { default as react } from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		exclude: [],
		include: ['react/jsx-runtime'],
	},
	server: {
		port: 5051,
		host: '0.0.0.0',
	},
	build: {
		sourcemap: true,
	},
});
