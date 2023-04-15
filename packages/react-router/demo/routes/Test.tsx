import { useParams } from '../../src/index.js';

export function Test() {
	const { test, id } = useParams();

	return (
		<div>
			<div>Nested params test</div>
			<div>ID: {id}</div>
			<div>Test: {test}</div>
		</div>
	);
}

export default Test;
