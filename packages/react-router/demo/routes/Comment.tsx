import { useParams } from '../../src/index.js';

export function Comment() {
	const { id, commentId } = useParams<{ id: string; commentId: string }>();

	return (
		<div>
			Comment {commentId} on post {id}
		</div>
	);
}
export default Comment;
