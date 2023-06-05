import { Suspense } from 'react';
import { Link, RouteByPath } from '../../src/index.js';

export function Home() {
	return (
		<div className="page">
			<div>Home</div>
			<Link to="/posts/2">Direct post link</Link>
			<div>Preview of that page:</div>
			<Suspense fallback={<div>Loading...</div>}>
				<RouteByPath path="/posts/2" />
			</Suspense>
		</div>
	);
}
export default Home;
