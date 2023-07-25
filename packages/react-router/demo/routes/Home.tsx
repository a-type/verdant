import { Suspense } from 'react';
import { Link, RouteTree } from '../../src/index.js';
import { ScrollTester } from '../ScrollTester.js';

export function Home() {
	return (
		<div className="page">
			<div>Home</div>
			<Link to="/posts/2">Direct post link</Link>
			<div>Route tree for /posts</div>
			<Suspense fallback={<div>Loading...</div>}>
				<RouteTree path="/posts" />
			</Suspense>
			{/* <ScrollTester /> */}
		</div>
	);
}
export default Home;
