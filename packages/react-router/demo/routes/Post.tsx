import { useParams } from '../../src/index.js';

export function Post() {
	const { id } = useParams<{ id: string }>();
	return <div>Post {id}!</div>;
}
export default Post;
