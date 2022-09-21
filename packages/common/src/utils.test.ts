import { describe, expect, it } from 'vitest';
import { getSortedIndex } from './utils.js';

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
});
