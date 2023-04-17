import { useParams } from '../../src/index.js';

export function Test() {
	const params = useParams();

	return (
		<div>
			<div>Nested params test</div>
			<pre>{JSON.stringify(params)}</pre>
		</div>
	);
}

export default Test;
