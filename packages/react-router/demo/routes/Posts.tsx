import { Suspense } from 'react';
import { Link } from '../../src/Link.js';
import { Outlet } from '../../src/Outlet.js';

export function Posts() {
	return (
		<div>
			<h1>Posts</h1>
			<ul>
				<li>
					<Link to="/posts/1">Post 1</Link>
				</li>
				<li>
					<Link to="/posts/2">Post 2</Link>
				</li>
			</ul>
			<div>
				<Suspense fallback={<div>Loading post...</div>}>
					<Outlet />
				</Suspense>
			</div>
		</div>
	);
}
export default Posts;
