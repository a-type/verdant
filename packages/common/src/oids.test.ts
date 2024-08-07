import { describe, expect, it } from 'vitest';
import { createFileRef } from './files.js';
import {
	assignOid,
	assignOidsToAllSubObjects,
	createOid,
	decomposeOid,
	getOidSubIdRange,
	hasOid,
	normalize,
	normalizeFirstLevel,
	ObjectIdentifier,
} from './oids.js';

describe('normalizing an object', () => {
	it('should return a map of sub-objects with relationships replaced by refs', () => {
		let i = 0;
		function createSubId() {
			return (i++).toString();
		}

		const initial = {
			foo: {
				bar: 1,
				baz: [2, 3],
			},
			qux: [
				{
					corge: true,
				},
				{
					grault: {
						garply: 4,
					},
				},
			],
		};
		assignOid(initial, 'test/a');
		assignOidsToAllSubObjects(initial, createSubId);

		const result = normalize(initial);

		expect(result.get('test/a')).toEqual(
			assignOid(
				{
					foo: {
						'@@type': 'ref',
						id: 'test/a:0',
					},
					qux: {
						'@@type': 'ref',
						id: 'test/a:2',
					},
				},
				'test/a',
			),
		);
		expect(result.get('test/a:0')).toEqual(
			assignOid(
				{
					bar: 1,
					baz: {
						'@@type': 'ref',
						id: 'test/a:1',
					},
				},
				'test/a:0',
			),
		);
		expect(result.get('test/a:1')).toEqual(assignOid([2, 3], 'test/a:1'));
		expect(result.get('test/a:2')).toEqual(
			assignOid(
				[
					{
						'@@type': 'ref',
						id: 'test/a:3',
					},
					{
						'@@type': 'ref',
						id: 'test/a:4',
					},
				],
				'test/a:2',
			),
		);
		expect(result.get('test/a:3')).toEqual(
			assignOid(
				{
					corge: true,
				},
				'test/a:3',
			),
		);
		expect(result.get('test/a:4')).toEqual(
			assignOid(
				{
					grault: {
						'@@type': 'ref',
						id: 'test/a:5',
					},
				},
				'test/a:4',
			),
		);
		expect(result.get('test/a:5')).toEqual(
			assignOid(
				{
					garply: 4,
				},
				'test/a:5',
			),
		);
	});

	it('should handle file references and not replace them with refs or attempt to normalize them', () => {
		let i = 0;
		function createSubId() {
			return (i++).toString();
		}

		const initial = {
			foo: {
				bar: 1,
				file: createFileRef('abcd123'),
			},
			qux: [createFileRef('efgh456'), createFileRef('ijkl789')],
		};
		assignOid(initial, 'test/a');
		assignOidsToAllSubObjects(initial, createSubId);

		const result = normalize(initial);

		expect(result.size).toBe(3);

		expect(result.get('test/a')).toEqual(
			assignOid(
				{
					foo: {
						'@@type': 'ref',
						id: 'test/a:0',
					},
					qux: {
						'@@type': 'ref',
						id: 'test/a:1',
					},
				},
				'test/a',
			),
		);
		expect(result.get('test/a:0')).toEqual(
			assignOid(
				{
					bar: 1,
					file: {
						'@@type': 'file',
						id: 'abcd123',
					},
				},
				'test/a:0',
			),
		);
		expect(result.get('test/a:1')).toEqual(
			assignOid(
				[
					{
						'@@type': 'file',
						id: 'efgh456',
					},
					{
						'@@type': 'file',
						id: 'ijkl789',
					},
				],
				'test/a:2',
			),
		);
	});
});

describe('normalizing the first level of an object', () => {
	it('collects all top-level sub-objects', () => {
		let i = 0;
		function createSubId() {
			return (i++).toString();
		}

		const initial = {
			foo: {
				bar: 1,
				baz: [2, 3],
			},
			qux: [
				{
					corge: true,
				},
				{
					grault: {
						garply: 4,
					},
				},
			],
		};
		assignOid(initial, 'test/a');
		assignOidsToAllSubObjects(initial, createSubId);

		const { refs: result } = normalizeFirstLevel(initial);

		expect(result.get('test/a')).toMatchInlineSnapshot(`
			{
			  "foo": {
			    "@@type": "ref",
			    "id": "test/a:0",
			  },
			  "qux": {
			    "@@type": "ref",
			    "id": "test/a:2",
			  },
			}
		`);
		expect(result.get('test/a:0')).toMatchInlineSnapshot(`
			{
			  "bar": 1,
			  "baz": [
			    2,
			    3,
			  ],
			}
		`);
		expect(result.get('test/a:1')).toBeUndefined();
		expect(result.get('test/a:2')).toMatchInlineSnapshot(`
			[
			  {
			    "corge": true,
			  },
			  {
			    "grault": {
			      "garply": 4,
			    },
			  },
			]
		`);
		expect(result.get('test/a:3')).toBeUndefined();
		expect(result.get('test/a:4')).toBeUndefined();
		expect(result.get('test/a:5')).toBeUndefined();
	});
});

describe('computing a range of oids for a whole object set', () => {
	function isWithin(
		oid: ObjectIdentifier,
		start: ObjectIdentifier,
		end: ObjectIdentifier,
	) {
		return oid >= start && oid <= end;
	}
	it('should include the root object and any possible sub object oid', () => {
		const [start, end] = getOidSubIdRange('test/a');
		expect(start).toEqual('test/a:');
		expect(end).toEqual('test/a:\uffff');
		expect(start < end).toBe(true);
		expect(isWithin('test/a:0', start, end)).toBe(true);
		expect(isWithin('test/a:1', start, end)).toBe(true);
		expect(isWithin('test/a:zzzzzzzzzzzzzzzzzzzzzzz', start, end)).toBe(true);
		expect(isWithin('test/a:\uffff', start, end)).toBe(true);
		expect(isWithin('test1/a', start, end)).toBe(false);
		expect(isWithin('test/b', start, end)).toBe(false);
		expect(isWithin('test/ ', start, end)).toBe(false);
		expect(isWithin('test/a1', start, end)).toBe(false);
		expect(isWithin('test/a1:3', start, end)).toBe(false);
	});
});

it('should handle special characters in document id or collection', () => {
	expect(
		decomposeOid(
			createOid('test.teesssst/asdf::', 'foo/bar (.) : huh:', 'corge'),
		),
	).toEqual({
		collection: 'test.teesssst/asdf::',
		id: 'foo/bar (.) : huh:',
		subId: 'corge',
	});
});

describe('assigning OIDs to sub-objects', () => {
	it('should not assign oids to refs', () => {
		const obj = {
			foo: {
				file: createFileRef('1a'),
			},
			bar: [createFileRef('2a')],
		};
		assignOid(obj, 'test/a');
		assignOidsToAllSubObjects(obj);

		expect(hasOid(obj.foo.file)).toBe(false);
		expect(hasOid(obj.bar[0])).toBe(false);
	});
});
