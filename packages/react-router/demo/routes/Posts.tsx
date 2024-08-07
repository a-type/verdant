import { Suspense } from 'react';
import { Link } from '../../src/Link.js';
import { Outlet } from '../../src/Outlet.js';
import { ContainerScrollTester, ScrollTester } from '../ScrollTester.js';

export function Posts() {
	return (
		<div style={{ background: 'lightblue' }} className="page">
			<h1>Posts</h1>
			<ul>
				<li>
					<Link to="/posts/1">Post 1</Link>
				</li>
				<li>
					<Link to="/posts/2" skipTransition>
						Post 2 (no transition)
					</Link>
				</li>
				<li>
					<Link to="/home" state={{ cancel: true }}>
						Home (cancel navigation)
					</Link>
				</li>
			</ul>
			<div>
				<Suspense fallback={<div>Loading post...</div>}>
					<Outlet />
				</Suspense>
			</div>
			<ContainerScrollTester />
		</div>
	);
}
export default Posts;
