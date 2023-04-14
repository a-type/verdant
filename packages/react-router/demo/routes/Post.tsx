import { useParams } from '../../src/index.js';
import { getPost, loadPost } from '../data/fakePosts.js';

export function Post() {
	const { id } = useParams<{ id: string }>();

	const post = getPost(id);
	if (!post) {
		throw loadPost(id);
	}

	return (
		<div>
			<h1>{post.title}</h1>
			<p>{post.content}</p>
		</div>
	);
}
export default Post;
