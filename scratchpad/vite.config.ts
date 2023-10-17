import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [],
	optimizeDeps: {
		exclude: [],
		include: [],
	},
	server: {
		port: 4060,
		host: '0.0.0.0',
	},
	build: {
		sourcemap: true,
	},
});
