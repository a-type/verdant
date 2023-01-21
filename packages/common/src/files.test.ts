import { describe, expect, it } from 'vitest';
import { processValueFiles, FileData } from './files.js';

function makeFile() {
	return new File([''], 'test.txt', { type: 'text/plain' });
}

describe('processing files in a value', () => {
	it('replaces a single file with a reference', () => {
		const file = makeFile();
		const list: FileData[] = [];
		const result = processValueFiles(file, list.push.bind(list));
		expect(result).toEqual({
			'@@type': 'file',
			id: expect.stringContaining(''),
		});
		expect(list).toEqual([
			{
				id: expect.stringContaining(''),
				blob: file,
				url: null,
				remote: false,
				name: 'test.txt',
				type: 'text/plain',
			},
		]);
	});

	it('replaces a list of files with references', () => {
		const file1 = makeFile();
		const file2 = makeFile();
		const list: FileData[] = [];
		const result = processValueFiles([file1, file2], list.push.bind(list));
		expect(result).toEqual([
			{ '@@type': 'file', id: expect.stringContaining('') },
			{ '@@type': 'file', id: expect.stringContaining('') },
		]);
		expect(list).toEqual([
			{
				id: expect.stringContaining(''),
				blob: file1,
				url: null,
				remote: false,
				name: 'test.txt',
				type: 'text/plain',
			},
			{
				id: expect.stringContaining(''),
				blob: file2,
				url: null,
				remote: false,
				name: 'test.txt',
				type: 'text/plain',
			},
		]);
		expect(result[0].id).not.toEqual(result[1].id);
	});

	it('replaces nested files with references', () => {
		const file = makeFile();
		const list: FileData[] = [];
		const result = processValueFiles({ a: { b: file } }, list.push.bind(list));
		expect(result).toEqual({
			a: {
				b: {
					'@@type': 'file',
					id: expect.stringContaining(''),
				},
			},
		});
		expect(list).toEqual([
			{
				id: expect.stringContaining(''),
				blob: file,
				url: null,
				remote: false,
				name: 'test.txt',
				type: 'text/plain',
			},
		]);
	});
});
