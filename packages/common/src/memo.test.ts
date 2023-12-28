import { describe, expect, it, vi } from 'vitest';
import { memoByKeys } from './memo.js';

describe('memoByKeys', () => {
	it('memoizes from provided key list', () => {
		let i = 0;
		const a = {
			value: 0,
		};
		const b = {
			value: 0,
		};
		const compute = vi.fn(() => a.value + b.value);
		const keys = [a, b];

		const memoized = memoByKeys(compute, () => keys);

		expect(memoized()).toEqual(0);
		expect(memoized()).toEqual(0);
		// ok, change the values - but not key identities
		a.value = 1;
		expect(memoized()).toEqual(0);

		expect(compute).toHaveBeenCalledOnce();

		keys.push({ value: 0 });
		expect(memoized()).toEqual(1);
		expect(memoized()).toEqual(1);
		expect(compute).toHaveBeenCalledTimes(2);
	});
});
