import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
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
	resolve: {
		alias: {
			react: path.resolve('./node_modules/react'),
			'react-dom': path.resolve('./node_modules/react-dom'),
		},
	},
});
