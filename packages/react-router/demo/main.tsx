import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import {
	Link,
	Outlet,
	Router,
	TransitionIndicator,
	makeRoutes,
	useMatch,
	useParams,
} from '../src/index.js';
import { loadPost } from './data/fakePosts.js';
import { delay } from './data/utils.js';
import { Home } from './routes/Home.js';
import { RouteTransition } from './RouteTransition.js';

// this fake loading can be "preloaded" by calling early,
// and will return immediately if already loaded
let fakeLoadPromise: Promise<void> | null = null;
function fakeComponentLatency() {
	if (fakeLoadPromise) return fakeLoadPromise;
	fakeLoadPromise = delay(3000);
	return fakeLoadPromise;
}

const Passthrough = () => <Outlet />;

const routes = makeRoutes([
	{
		index: true,
		component: Home,
		onVisited: () => {
			// fake preloading the posts page - this pre-runs the
			// fake latency function so it's ready when loading the
			// /posts route
			return fakeComponentLatency();
		},
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
				index: true,
				component: () => <div>Welcome to posts</div>,
			},
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
					{
						path: 'comments/:commentId',
						component: lazy(() => import('./routes/Comment.jsx')),
					},
				],
			},
		],
	},
	{
		path: '*',
		component: () => <div>404</div>,
	},
]);

function handleNavigate(path: string, { state }: { state?: any }) {
	if (state?.cancel) {
		console.log('Navigation cancelled!');
		return false;
	}
}

function App() {
	return (
		<Router basePath="/base/" routes={routes} onNavigate={handleNavigate}>
			<main className="main">
				<nav style={{ position: 'sticky', top: 0, zIndex: 1 }}>
					<Link to="/">Home</Link>
					<Link to="/posts">Posts</Link>
					<Link to="/foo">404</Link>
					<TestMatch path="/posts" />
					<TestParams />
				</nav>
				<TransitionIndicator delay={1000}>
					<div>Loading next page...</div>
				</TransitionIndicator>
				<div className="content">
					<Suspense fallback={<div>Loading...</div>}>
						<RouteTransition />
					</Suspense>
				</div>
			</main>
		</Router>
	);
}

function TestMatch({ path }: { path: string }) {
	const matchesPosts = useMatch({
		path,
		end: false,
	});

	if (matchesPosts) return <div>Matches {path}</div>;
	return null;
}

function TestParams() {
	const params = useParams();
	return <div>{JSON.stringify(params)}</div>;
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
