import { describe, expect, it } from 'vitest';
import {
	getLegacyDotOidSubIdRange,
	MATCH_LEGACY_OID_JSON_STRING,
	replaceLegacyOidsInObject,
} from './oidsLegacy.js';
import {
	areOidsRelated,
	createSubOid,
	getOidRoot,
	ObjectIdentifier,
} from './oids.js';

describe('handling legacy OIDs', () => {
	it('should get the root OID for a legacy OID', () => {
		expect(getOidRoot('items/clabgyjfh00003968qycsq3ld.inputs.#')).toEqual(
			'items/clabgyjfh00003968qycsq3ld',
		);
	});
	it('should create sub-ids for legacy OIDs in new format', () => {
		expect(
			createSubOid(
				'items/clabgyjfh00003968qycsq3ld.inputs.#',
				() => 'pseudorandom',
			),
		).toEqual('items/clabgyjfh00003968qycsq3ld:pseudorandom');
	});
	it('should identify new sub-OIDs as related to the legacy root OID', () => {
		expect(
			areOidsRelated(
				'items/clabgyjfh00003968qycsq3ld.inputs.#',
				'items/clabgyjfh00003968qycsq3ld:pseudorandom',
			),
		).toBe(true);
	});
	it.each([
		['items/clabgyjfh00003968qycsq3ld.inputs.#:baz', true],
		// include more unicode chars
		['items/clabgyjfh00003968qycsq3ld\ufea3.inputs\u39fc.#:baz!!!', true],
		// not matching new oids
		['items/clabgyjfh00003968qycsq3ld', false],
		['items/clabgyjfh00003968qycsq3ld:baz', false],
		['items/clabgyjfh00003968qycsq3ld:baz1111', false],
		// not matching anything else
		[
			'PREPARE SOUS VIDE BATH: Fill container or pot with water. Set the temperature to 130F/54.4C – 132F/55.5C (for very moist and tender) and allow water to heat to that temperature.Tip: start with hot tap water instead of cold water to reduce heating time. Note 4 for other temperatures.',
			false,
		],
	])('matches legacy oids', (oid, match) => {
		expect(MATCH_LEGACY_OID_JSON_STRING.test('"' + oid + '"'), oid).toBe(match);
		// regex are stateful 🙄
		MATCH_LEGACY_OID_JSON_STRING.lastIndex = 0;
	});
	it.each([
		[
			{ op: 'delete', oid: 'items/clabgyjfh00003968qycsq3ld.inputs.#:baz' },
			{ op: 'delete', oid: 'items/clabgyjfh00003968qycsq3ld:baz' },
		],
		[
			{
				op: 'list-push',
				oid: 'items/clabgyjfh00003968qycsq3ld.inputs.#:baz',
				value: {
					'@@type': 'ref',
					id: 'items/clabgyjfh00003968qycsq3ld.inputs.#:qux',
				},
			},
			{
				op: 'list-push',
				oid: 'items/clabgyjfh00003968qycsq3ld:baz',
				value: { '@@type': 'ref', id: 'items/clabgyjfh00003968qycsq3ld:qux' },
			},
		],
		[
			{
				op: 'list-remove',
				oid: 'items/clabgyjfh00003968qycsq3ld.inputs.#:baz',
				value: {
					'@@type': 'ref',
					id: 'items/clabgyjfh00003968qycsq3ld.inputs.#:qux',
				},
			},
			{
				op: 'list-remove',
				oid: 'items/clabgyjfh00003968qycsq3ld:baz',
				value: { '@@type': 'ref', id: 'items/clabgyjfh00003968qycsq3ld:qux' },
			},
		],
		[
			{
				oid: 'items/clabgyjfh00003968qycsq3ld.inputs.#:baz',
				timestamp: '2021-03-04T21:00:00.000Z',
				snapshot: {
					foo: 1,
					bar: {
						'@@type': 'ref',
						id: 'items/clabgyjfh00003968qycsq3ld.inputs.#:qux',
					},
				},
			},
			{
				oid: 'items/clabgyjfh00003968qycsq3ld:baz',
				timestamp: '2021-03-04T21:00:00.000Z',
				snapshot: {
					foo: 1,
					bar: { '@@type': 'ref', id: 'items/clabgyjfh00003968qycsq3ld:qux' },
				},
			},
		],
		[
			{ oid: 'test/what if.boo.blah so what:fajsdfj' },
			{ oid: 'test/what if:fajsdfj' },
		],
	])(
		'should replace legacy OIDs in a JSON string with new OIDs',
		(from, to) => {
			expect(replaceLegacyOidsInObject(from), JSON.stringify(from)).toEqual(to);
		},
	);

	it('should accommodate legacy dot style oids when computing ranges', () => {
		function isWithin(
			oid: ObjectIdentifier,
			start: ObjectIdentifier,
			end: ObjectIdentifier,
		) {
			return oid >= start && oid <= end;
		}

		const [start, end] = getLegacyDotOidSubIdRange('test/a.foo:barrrr');
		expect(start).toEqual('test/a.');
		expect(end).toEqual('test/a.\uffff');
		expect(start < end).toBe(true);
		expect(isWithin('test/a.foo:0', start, end)).toBe(true);
		expect(isWithin('test/a.foo:1', start, end)).toBe(true);
		expect(isWithin('test/a.bar:zzzzzzzzzzzzzzzzzzzzzzz', start, end)).toBe(
			true,
		);
		expect(isWithin('test/a.aff:\uffff', start, end)).toBe(true);
		expect(isWithin('test1/a', start, end)).toBe(false);
		expect(isWithin('test/b', start, end)).toBe(false);
		expect(isWithin('test/ ', start, end)).toBe(false);
		expect(isWithin('test/a1', start, end)).toBe(false);
		expect(isWithin('test/a1:3', start, end)).toBe(false);
		expect(isWithin('test/a.foo:barrrr', start, end)).toBe(true);
	});
});
