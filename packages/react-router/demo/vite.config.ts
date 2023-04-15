import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		include: ['react/jsx-runtime', 'react', 'react-dom'],
	},
	resolve: {
		alias: {
			'~': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		port: 3010,
	},
	build: {
		sourcemap: true,
	},
});
