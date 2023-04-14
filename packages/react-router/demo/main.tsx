import { Suspense, lazy } from 'react';
import { Router, Outlet, Link, TransitionIndicator } from '../src/index.js';
import { createRoot } from 'react-dom/client';
import { Home } from './routes/Home.js';

function App() {
	return (
		<Router
			routes={[
				{
					path: '/',
					exact: true,
					component: Home,
				},
				{
					path: '/posts',
					// fake slow loading
					component: lazy(() =>
						new Promise((resolve) => setTimeout(resolve, 3 * 1000)).then(
							() => import('./routes/Posts.jsx'),
						),
					),
					children: [
						{
							path: ':id',
							component: lazy(() => import('./routes/Post.jsx')),
						},
					],
				},
			]}
		>
			<main>
				<div>
					<Link to="/">Home</Link>
					<Link to="/posts">Posts</Link>
				</div>
				<TransitionIndicator delay={1000}>
					<div>Loading next page...</div>
				</TransitionIndicator>
				<div>
					<Suspense fallback={<div>Loading...</div>}>
						<Outlet />
					</Suspense>
				</div>
			</main>
		</Router>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
