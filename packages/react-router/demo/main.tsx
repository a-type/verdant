import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, Outlet, Router, TransitionIndicator } from '../src/index.js';
import { loadPost } from './data/fakePosts.js';
import { delay } from './data/utils.js';
import { Home } from './routes/Home.js';

// this fake loading can be "preloaded" by calling early,
// and will return immediately if already loaded
let fakeLoadPromise: Promise<void> | null = null;
function fakeComponentLatency() {
	if (fakeLoadPromise) return fakeLoadPromise;
	fakeLoadPromise = delay(3000);
	return fakeLoadPromise;
}

const Passthrough = () => <Outlet />;

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
					component: lazy(async () => {
						// fake slow loading
						await fakeComponentLatency();
						return import('./routes/Posts.jsx');
					}),
					children: [
						{
							path: ':id',
							component: lazy(async () => {
								console.log('Loading Post component');
								// always takes 5 seconds to load the Post page
								await delay(5000);
								console.log('Done loading Post component');
								return import('./routes/Post.jsx');
							}),
							onVisited: async ({ id }) => {
								console.log(`Loading post ${id}`);
								// preload the post data when the link is clicked.
								// this data takes 3 seconds to load, but you'll
								// never see it load because this preload runs in
								// parallel with the  5-second lazy component load above.
								// Even when you DO see a loading state for a Post,
								// it's because the component is loading, not this
								// data, which finishes first!
								await loadPost(id, 'onVisited');
								console.log(`Done loading post ${id}`);
							},
							children: [
								{
									path: 'passthrough',
									component: Passthrough,
									children: [
										{
											path: ':test',
											component: lazy(() => import('./routes/Test.jsx')),
										},
									],
								},
							],
						},
					],
					// preloads the Posts page component when
					// a link to it is mounted
					onAccessible: () => {
						console.log('Preloading Posts component');
						fakeComponentLatency();
					},
				},
			]}
		>
			<main>
				<nav>
					<Link to="/">Home</Link>
					<Link to="/posts">Posts</Link>
				</nav>
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
