export function createTestFile(content?: string) {
	return new window.File(
		content ? [new Blob([content], { type: 'text/plain' })] : [],
		'test.txt',
		{
			type: 'text/plain',
		},
	);
}
