import { Link, Outlet, RouteByPath, useParams } from '../../src/index.js';
import { getPost, loadPost } from '../data/fakePosts.js';

export function Post() {
	const { id } = useParams<{ id: string }>();

	const post = getPost(id);
	if (!post) {
		throw loadPost(id, 'component');
	}

	return (
		<div>
			<h1>{post.title}</h1>
			<p>{post.content}</p>
			<ul>
				<li>
					<Link to={`/posts/${id}/passthrough/testable`}>Test</Link>
				</li>
				<li>
					<Link to={`/posts/${id}/comments/demo-comment`}>Demo comment</Link>
				</li>
			</ul>
			<Outlet />
			<div>Preview test:</div>
			<RouteByPath path="passthrough/testable" />
		</div>
	);
}
export default Post;
