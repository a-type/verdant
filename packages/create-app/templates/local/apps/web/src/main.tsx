import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

function main() {
	const root = createRoot(document.getElementById('root')!);
	root.render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

main();
