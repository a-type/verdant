import { Router, Outlet, RouteConfig } from '../src/index.js';
import { createRoot } from 'react-dom/client';

const route: RouteConfig = {
	path: '/',
	component: () => <div>Home</div>,
	children: [
		{
			path: 'about',
			component: () => <div>About</div>,
		},
	],
};

function App() {
	return (
		<Router rootRoute={route}>
			<main>
				<div>
					<a href="/">Home</a>
					<a href="/about">About</a>
				</div>
				<div>
					<Outlet />
				</div>
			</main>
		</Router>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
