export function assert(
	condition: any,
	message: string = 'assertion failed',
): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}
