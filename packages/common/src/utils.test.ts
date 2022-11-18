import { describe, expect, it } from 'vitest';
import { assignOid, assignOidsToAllSubObjects, getOid } from './oids.js';
import { cloneDeep, getSortedIndex } from './utils.js';

describe('utils', () => {
	describe('get sorted index', () => {
		it('finds the right insertion index', () => {
			function compare(a: number, b: number) {
				return a - b;
			}
			expect(getSortedIndex([1, 2, 3, 4, 5], 6, compare)).toBe(5);
			expect(getSortedIndex([1, 2, 3, 4, 5], 0, compare)).toBe(0);
			expect(getSortedIndex([1, 2, 3, 4, 5], -1, compare)).toBe(0);
			expect(getSortedIndex([1, 2, 3, 4, 5], 20, compare)).toBe(5);
		});
	});

	describe('clone deep', () => {
		it('preserves OIDs', () => {
			const obj = {
				foo: 'bar',
				qux: [
					{
						corge: true,
					},
				],
			};
			assignOid(obj, 'test/a');
			assignOidsToAllSubObjects(obj);

			const cloned = cloneDeep(obj);

			expect(getOid(cloned)).toEqual(getOid(obj));
			expect(getOid(cloned.qux)).toEqual(getOid(obj.qux));
			expect(getOid(cloned.qux[0])).toEqual(getOid(obj.qux[0]));
		});
	});
});
