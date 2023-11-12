import { describe, expect, it } from 'vitest';
import { createFileRef } from './files.js';
import {
	areOidsRelated,
	assignOid,
	assignOidPropertiesToAllSubObjects,
	assignOidProperty,
	assignOidsToAllSubObjects,
	createOid,
	createSubOid,
	decomposeOid,
	getOid,
	getOidSubIdRange,
	getOidRoot,
	hasOid,
	maybeGetOidProperty,
	normalize,
	normalizeFirstLevel,
	ObjectIdentifier,
	removeOidPropertiesFromAllSubObjects,
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
		expect(start).toEqual('test/a');
		expect(end).toEqual('test/a:\uffff');
		expect(start < end).toBe(true);
		expect(isWithin('test/a', start, end)).toBe(true);
		expect(isWithin('test/a:0', start, end)).toBe(true);
		expect(isWithin('test/a:1', start, end)).toBe(true);
		expect(isWithin('test/a:zzzzzzzzzzzzzzzzzzzzzzz', start, end)).toBe(true);
		expect(isWithin('test/a:\uffff', start, end)).toBe(true);
		expect(isWithin('test1/a', start, end)).toBe(false);
		expect(isWithin('test/b', start, end)).toBe(false);
		expect(isWithin('test/ ', start, end)).toBe(false);
	});
});

describe('assigning OIDs as properties', () => {
	it('should assign to all sub-objects', () => {
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
		assignOidPropertiesToAllSubObjects(initial);

		expect(initial).toMatchInlineSnapshot(`
			{
			  "@@id": "test/a",
			  "foo": {
			    "@@id": "test/a:0",
			    "bar": 1,
			    "baz": [
			      2,
			      3,
			    ],
			  },
			  "qux": [
			    {
			      "@@id": "test/a:3",
			      "corge": true,
			    },
			    {
			      "@@id": "test/a:4",
			      "grault": {
			        "@@id": "test/a:5",
			        "garply": 4,
			      },
			    },
			  ],
			}
		`);
		// extra check needed for array since it doesn't serialize in the snapshot
		expect(maybeGetOidProperty(initial.qux)).toBe('test/a:2');
	});

	it('should transfer assigned OID properties to the memory system', () => {
		const initial = assignOidProperty(
			{
				foo: assignOidProperty(
					{
						bar: 1,
					},
					'test/a:1',
				),
				qux: assignOidProperty(
					[
						assignOidProperty(
							{
								corge: true,
							},
							'test/a:2',
						),
						assignOidProperty(
							{
								grault: assignOidProperty(
									{
										garply: 4,
									},
									'test/a:3',
								),
							},
							'test/a:4',
						),
					],
					'test/a:2',
				),
			},
			'test/a',
		);

		removeOidPropertiesFromAllSubObjects(initial);

		expect(getOid(initial)).toEqual('test/a');
		expect(getOid(initial.foo)).toEqual('test/a:1');
		expect(getOid(initial.qux)).toEqual('test/a:2');
		expect(getOid(initial.qux[0])).toEqual('test/a:2');
		expect(getOid(initial.qux[1])).toEqual('test/a:4');
		expect(getOid(initial.qux[1].grault)).toEqual('test/a:3');
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
});
