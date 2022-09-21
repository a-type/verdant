import { describe, expect, it } from 'vitest';
import {
	COMPOUND_INDEX_LOWER_BOUND_SEPARATOR,
	COMPOUND_INDEX_SEPARATOR,
	COMPOUND_INDEX_UPPER_BOUND_SEPARATOR,
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
} from './indexes.js';

describe('compound indexes', () => {
	it('can be created from two string values', () => {
		expect(createCompoundIndexValue('a', 'b')).toEqual(
			`a${COMPOUND_INDEX_SEPARATOR}b`,
		);
	});
	it('can be created from two number values', () => {
		expect(createCompoundIndexValue(1, 2)).toEqual(
			`1${COMPOUND_INDEX_SEPARATOR}2`,
		);
	});
	it('can be created from an array and string value', () => {
		expect(createCompoundIndexValue(['a', 'b'], 'c')).toEqual([
			`a${COMPOUND_INDEX_SEPARATOR}c`,
			`b${COMPOUND_INDEX_SEPARATOR}c`,
		]);
	});
	it('can be created from a string and array of numbers', () => {
		expect(createCompoundIndexValue('a', [1, 2])).toEqual([
			`a${COMPOUND_INDEX_SEPARATOR}1`,
			`a${COMPOUND_INDEX_SEPARATOR}2`,
		]);
	});
	it('can be created from an array of strings and an array of booleans', () => {
		expect(createCompoundIndexValue(['a', 'b'], [true, false])).toEqual([
			`a${COMPOUND_INDEX_SEPARATOR}true`,
			`a${COMPOUND_INDEX_SEPARATOR}false`,
			`b${COMPOUND_INDEX_SEPARATOR}true`,
			`b${COMPOUND_INDEX_SEPARATOR}false`,
		]);
	});
	it('remove duplicate array compound index values', () => {
		expect(
			createCompoundIndexValue(['a', 'b', 'b'], [true, false, true]),
		).toEqual([
			`a${COMPOUND_INDEX_SEPARATOR}true`,
			`a${COMPOUND_INDEX_SEPARATOR}false`,
			`b${COMPOUND_INDEX_SEPARATOR}true`,
			`b${COMPOUND_INDEX_SEPARATOR}false`,
		]);
	});

	it('creates lower bound value for multi-value indexes', () => {
		expect(createLowerBoundIndexValue('a', 'b')).toEqual(
			`a${COMPOUND_INDEX_SEPARATOR}b${COMPOUND_INDEX_SEPARATOR}${COMPOUND_INDEX_LOWER_BOUND_SEPARATOR}`,
		);
	});

	it('creates upper bound value for multi-value indexes', () => {
		expect(createUpperBoundIndexValue('a', 'b')).toEqual(
			`a${COMPOUND_INDEX_SEPARATOR}b${COMPOUND_INDEX_UPPER_BOUND_SEPARATOR}`,
		);
	}),
		it('will always be grouped by the first item', () => {
			expect(
				[
					createCompoundIndexValue('aaaaaa', 'b'),
					createCompoundIndexValue('aaaaaa', 'c'),
					createCompoundIndexValue('aaaaaa', 'd'),
					createCompoundIndexValue('aaaaaa', 'e'),
					// extra nefarious!
					createCompoundIndexValue('aaaaaaa', 'no!'),
					createCompoundIndexValue('aaaaaa ', 'no!'),
					createCompoundIndexValue(`aaaaaa😎`, 'no!'),
					createCompoundIndexValue(`aaaaaa😎😎`, 'no!'),
					createCompoundIndexValue('aaa', 'no!'),
					createCompoundIndexValue(`aaaaaaa😎no!`, 'no!'),
				].sort(),
			).toEqual([
				`aaaaaa ${COMPOUND_INDEX_SEPARATOR}no!`,
				`aaaaaaa😎no!${COMPOUND_INDEX_SEPARATOR}no!`,
				`aaaaaaa${COMPOUND_INDEX_SEPARATOR}no!`,
				`aaaaaa😎😎${COMPOUND_INDEX_SEPARATOR}no!`,
				`aaaaaa😎${COMPOUND_INDEX_SEPARATOR}no!`,
				// this is the contiguous block of relevant values
				`aaaaaa${COMPOUND_INDEX_SEPARATOR}b`,
				`aaaaaa${COMPOUND_INDEX_SEPARATOR}c`,
				`aaaaaa${COMPOUND_INDEX_SEPARATOR}d`,
				`aaaaaa${COMPOUND_INDEX_SEPARATOR}e`,
				// here ends the block
				`aaa${COMPOUND_INDEX_SEPARATOR}no!`,
			]);
		});

	it('will be bounded by upper and lower bound values', () => {
		const match = 'aaaaaa';
		const sorted = [
			createCompoundIndexValue(match, 'b'),
			createCompoundIndexValue(match, 'c'),
			createCompoundIndexValue(match, 'd'),
			createCompoundIndexValue(match, 'e'),
			// extra nefarious!
			createCompoundIndexValue(`${match}a`, 'no!'),
			createCompoundIndexValue(`${match} `, 'no!'),
			createCompoundIndexValue(`${match}😎`, 'no!'),
			createCompoundIndexValue(`${match}😎😎`, 'no!'),
			createCompoundIndexValue('aaa', 'no!'),
			createCompoundIndexValue(`${match}a😎no!`, 'no!'),
		].sort();

		const boundedBlock = sorted.filter(
			(value) =>
				value > createLowerBoundIndexValue(match) &&
				value < createUpperBoundIndexValue(match),
		);
		expect(boundedBlock).toEqual([
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}b`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}c`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}d`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}e`,
		]);
	});

	it('will be bounded by upper and lower bounds when matching multiple sections', () => {
		const match1 = 'aaaaaa';
		const match2 = 'bbbbbb';
		const sorted = [
			createCompoundIndexValue(match1, match2, 'b'),
			createCompoundIndexValue(match1, match2, 'c'),
			createCompoundIndexValue(match1, match2, 'd'),
			createCompoundIndexValue(match1, match2, 'e'),
			// extra nefarious!
			createCompoundIndexValue(`${match1}a`, match2, 'no!'),
			createCompoundIndexValue(`${match1} `, match2, 'no!'),
			createCompoundIndexValue(`${match1}😎`, match2, 'no!'),
			createCompoundIndexValue(`${match1}😎😎`, match2, 'no!'),
			createCompoundIndexValue('aaa', match2, 'no!'),
			createCompoundIndexValue(`${match1}a😎no!`, match2, 'no!'),
			createCompoundIndexValue(match1, `${match2}a😎no!`, 'no!'),
			createCompoundIndexValue(match1, `${match2} `, 'no!'),
			createCompoundIndexValue(match1, ' ', 'no!'),
			createCompoundIndexValue(match1, '\u00001', 'no!'),
			createCompoundIndexValue(match1, '\uE007f', 'no!'),
		].sort();
		expect(
			sorted.filter(
				(value) =>
					value > createLowerBoundIndexValue(match1, match2) &&
					value < createUpperBoundIndexValue(match1, match2),
			),
		).toEqual([
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}bbbbbb${COMPOUND_INDEX_SEPARATOR}b`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}bbbbbb${COMPOUND_INDEX_SEPARATOR}c`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}bbbbbb${COMPOUND_INDEX_SEPARATOR}d`,
			`aaaaaa${COMPOUND_INDEX_SEPARATOR}bbbbbb${COMPOUND_INDEX_SEPARATOR}e`,
		]);
	});
});
