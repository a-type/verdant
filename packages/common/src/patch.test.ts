import { describe, it, expect } from 'vitest';
import {
	applyPatch,
	createListMovePatch,
	createListPushPatch,
	createPatch,
	keyPathToJsonPointer,
} from './patch.js';

describe('patch operations', () => {
	it('returns undefined when DELETE is applied', () => {
		expect(applyPatch({ foo: 'bar' }, 'DELETE')).toBe(undefined);
	});

	it('creates a diff patch which applies correctly', () => {
		const from = {
			foo: 'bar',
			baz: {
				qux: [1, 2, 3],
			},
			ding: false,
		};
		const to = {
			foo: 3,
			baz: {
				corge: {
					qux: [0],
				},
			},
		};
		const patch = createPatch(from, to);

		expect(applyPatch(from, patch)).toEqual(to);
	});

	it('creates a diff patch with a nested keypath which applies correctly', () => {
		const from = {
			foo: {
				8: {
					'/nefarious': {
						bar: true,
					},
				},
			},
		};
		const to = {
			foo: {
				8: {
					'/nefarious': {
						bar: false,
					},
				},
			},
		};

		const patch = createPatch(true, false, ['foo', '8', '/nefarious', 'bar']);
		expect(patch).toEqual([
			{
				op: 'replace',
				// nefarious path is escaped
				path: '/foo/8/~1nefarious/bar',
				value: false,
			},
		]);
		expect(applyPatch(from, patch)).toEqual(to);
	});

	it('creates a diff patch with a 0-length keypath which applies properly', () => {
		const from = {
			foo: 'bar',
			baz: 'corge',
		};
		const to = {
			foo: 'baz',
			baz: 'qux',
		};

		const patch = createPatch(from, to, []);
		expect(applyPatch(from, patch)).toEqual(to);
	});

	it('creates json pointers from key paths', () => {
		expect(keyPathToJsonPointer(['foo'])).toEqual('/foo');
		expect(keyPathToJsonPointer(['foo', 'bar'])).toEqual('/foo/bar');
		expect(keyPathToJsonPointer(['foo', 'bar', 'baz'])).toEqual('/foo/bar/baz');
		expect(keyPathToJsonPointer(['foo', 'bar', '/nefarious'])).toEqual(
			'/foo/bar/~1nefarious',
		);
	});

	it('creates a list reorder patch', () => {
		const from = {
			foo: [1, 2, 3],
		};
		const to = {
			foo: [1, 3, 2],
		};
		const patch = createListMovePatch(1, 2, ['foo']);
		expect(applyPatch(from, patch)).toEqual(to);
	});

	it('creates a list push patch which behaves correctly with multiple pushes', () => {
		const from = {
			list: [],
		};
		const to = {
			list: [1, 2, 3],
		};
		const patch1 = createListPushPatch(1, ['list']);
		const patch2 = createListPushPatch(2, ['list']);
		const patch3 = createListPushPatch(3, ['list']);
		expect(applyPatch(from, [...patch1, ...patch2, ...patch3])).toEqual(to);
	});
});
