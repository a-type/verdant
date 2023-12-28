export function createTestFile() {
	return new window.File([], 'test.txt', {
		type: 'text/plain',
	});
	// return new Blob([], {
	// 	type: 'text/plain',
	// }) as any;
}
