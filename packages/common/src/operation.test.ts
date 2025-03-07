import { describe, expect, it } from 'vitest';
import { FileRef } from './files.js';
import {
	assignOid,
	assignOidsToAllSubObjects,
	createRef,
	getOid,
	ObjectIdentifier,
} from './oids.js';
import {
	applyOperations,
	applyPatch,
	deconstructSnapshotToRefs,
	initialToPatches,
	ObjectRef,
	substituteRefsWithObjects,
} from './operation.js';

function createClock(init = 0) {
	let i = init;
	const clock = () => (i++).toString();
	Object.defineProperty(clock, 'current', {
		get() {
			return i;
		},
	});
	return clock;
}

describe('applying operations', () => {
	describe('on lists of primitives', () => {
		it('pushes items', async () => {
			expect(
				applyOperations(assignOid(['foo', 'bar'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-push',
							value: 'baz',
						},
					},
				]),
			).toEqual(assignOid(['foo', 'bar', 'baz'], 'test/a'));
		});
		it('sets items', () => {
			expect(
				applyOperations(assignOid(['foo', 'bar'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-set',
							index: 1,
							value: 'baz',
						},
					},
				]),
			).toEqual(assignOid(['foo', 'baz'], 'test/a'));
		});
		it('inserts items', () => {
			expect(
				applyOperations(assignOid(['foo', 'bar'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-insert',
							index: 1,
							values: ['baz'],
						},
					},
				]),
			).toEqual(assignOid(['foo', 'baz', 'bar'], 'test/a'));
		});
		it('removes items by index', () => {
			expect(
				applyOperations(assignOid(['foo', 'bar'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-delete',
							index: 1,
							count: 1,
						},
					},
				]),
			).toEqual(assignOid(['foo'], 'test/a'));
		});
		it('removes items by value', () => {
			expect(
				applyOperations(assignOid(['bar', 'foo', 'bar'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-remove',
							value: 'bar',
						},
					},
				]),
			).toEqual(assignOid(['foo'], 'test/a'));
		});
		it('moves items by index', () => {
			expect(
				applyOperations(assignOid(['foo', 'bar', 'baz'], 'test/a'), [
					{
						oid: 'test/a',
						timestamp: 'meh',
						data: {
							op: 'list-move-by-index',
							from: 2,
							to: 0,
						},
					},
				]),
			).toEqual(assignOid(['baz', 'foo', 'bar'], 'test/a'));
		});
	});
	describe.todo('on lists of lists', () => {
		it.todo('rejects operations by value or identity');
	});
});

describe('substituting refs with objects', () => {
	it('does nothing when no refs exist', () => {
		const root = {
			foo: 'bar',
		};
		assignOid(root, 'test/a');
		const substituted = substituteRefsWithObjects(root, new Map());
		expect(root).toEqual(
			assignOid(
				{
					foo: 'bar',
				},
				'test/a',
			),
		);
		expect(substituted).toEqual([]);
	});

	it('inserts top level objects with oids', () => {
		const root = {
			foo: {
				'@@type': 'ref',
				id: 'test/1:a',
			},
			qux: 1,
		};
		assignOid(root, 'test/1');

		const substituted = substituteRefsWithObjects(
			root,
			new Map([['test/1:a', { foo: 'bar' }]]),
		);
		expect(root).toEqual(
			assignOid(
				{
					foo: assignOid(
						{
							foo: 'bar',
						},
						'test/1:a',
					),
					qux: 1,
				},
				'test/1',
			),
		);
		expect(substituted).toEqual(['test/1:a']);
		expect(getOid(root)).toEqual('test/1');
		expect(getOid(root.foo)).toEqual('test/1:a');
	});

	it('inserts nested objects with oids', () => {
		const root: any = {
			foo: {
				'@@type': 'ref',
				id: 'test/1:a',
			},
		};
		assignOid(root, 'test/1');
		const substituted = substituteRefsWithObjects(
			root,
			new Map([
				[
					'test/1:a',
					{
						foo: 'bar',
						baz: {
							'@@type': 'ref',
							id: 'test/1:b',
						},
					},
				],
				[
					'test/1:b',
					{
						qux: 'corge',
					},
				],
			]),
		);
		expect(root).toEqual(
			assignOid(
				{
					foo: assignOid(
						{
							foo: 'bar',
							baz: assignOid(
								{
									qux: 'corge',
								},
								'test/1:b',
							),
						},
						'test/1:a',
					),
				},
				'test/1',
			),
		);
		expect(substituted).toEqual(['test/1:a', 'test/1:b']);
		expect(getOid(root)).toEqual('test/1');
		expect(getOid(root.foo)).toEqual('test/1:a');
		expect(getOid(root.foo.baz)).toEqual('test/1:b');
	});

	it('substitutes arrays of objects', () => {
		const root: any = {
			foo: {
				'@@type': 'ref',
				id: 'test/1:c',
			},
		};
		assignOid(root, 'test/1');

		const substituted = substituteRefsWithObjects(
			root,
			new Map([
				[
					'test/1:c',
					[
						{
							'@@type': 'ref',
							id: 'test/1:a',
						},
						{
							'@@type': 'ref',
							id: 'test/1:b',
						},
					],
				],
				[
					'test/1:a',
					{
						foo: 'bar',
					},
				],
				[
					'test/1:b',
					{
						qux: 'corge',
					},
				],
			]),
		);
		expect(root).toEqual({
			foo: assignOid(
				[
					assignOid(
						{
							foo: 'bar',
						},
						'test/1:a',
					),
					assignOid(
						{
							qux: 'corge',
						},
						'test/1:b',
					),
				],
				'test/1:c',
			),
		});
		expect(substituted).toEqual(['test/1:c', 'test/1:a', 'test/1:b']);
		expect(getOid(root)).toEqual('test/1');
		expect(getOid(root.foo)).toEqual('test/1:c');
		expect(getOid(root.foo[0])).toEqual('test/1:a');
		expect(getOid(root.foo[1])).toEqual('test/1:b');
	});

	it.todo('substitutes arrays of arrays of objects');
});

describe('substituting objects with refs', () => {
	it('deconstructs nested objects and arrays properly', () => {
		const snapshot = assignOid(
			{
				foo: {
					bar: {
						baz: [{ corge: 'qux' }, { grault: 'garply' }],
					},
					prim: 'hi',
				},
				cat: {
					percol: 'simmi',
				},
			},
			'test/a',
		);
		assignOidsToAllSubObjects(snapshot, createClock());
		const deconstructed = new Map<ObjectIdentifier, any>();
		deconstructSnapshotToRefs(snapshot, deconstructed);
		expect(deconstructed).toMatchInlineSnapshot(`
			Map {
			  "test/a" => {
			    "cat": {
			      "@@type": "ref",
			      "id": "test/a:5",
			    },
			    "foo": {
			      "@@type": "ref",
			      "id": "test/a:0",
			    },
			  },
			  "test/a:0" => {
			    "bar": {
			      "@@type": "ref",
			      "id": "test/a:1",
			    },
			    "prim": "hi",
			  },
			  "test/a:1" => {
			    "baz": {
			      "@@type": "ref",
			      "id": "test/a:2",
			    },
			  },
			  "test/a:2" => [
			    {
			      "@@type": "ref",
			      "id": "test/a:3",
			    },
			    {
			      "@@type": "ref",
			      "id": "test/a:4",
			    },
			  ],
			  "test/a:3" => {
			    "corge": "qux",
			  },
			  "test/a:4" => {
			    "grault": "garply",
			  },
			  "test/a:5" => {
			    "percol": "simmi",
			  },
			}
		`);
	});
});

describe('creating patches from initial state', () => {
	it('adds oids to all sub-objects', async () => {
		let i = 0;
		function createSubId() {
			return (i++).toString();
		}
		const result = initialToPatches(
			{
				foo: {
					bar: 'baz',
				},
				qux: [
					{
						corge: 'grault',
					},
					{
						bin: {
							oof: 1,
						},
					},
				],
			},
			'test/a',
			createClock(),
			createSubId,
		);
		/**
		 * Patches should not include assigned OID property
		 */
		expect(result).toMatchInlineSnapshot(`
			[
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "bar": "baz",
			      },
			    },
			    "oid": "test/a:0",
			    "timestamp": "0",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "corge": "grault",
			      },
			    },
			    "oid": "test/a:2",
			    "timestamp": "1",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "oof": 1,
			      },
			    },
			    "oid": "test/a:4",
			    "timestamp": "2",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "bin": {
			          "@@type": "ref",
			          "id": "test/a:4",
			        },
			      },
			    },
			    "oid": "test/a:3",
			    "timestamp": "3",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": [
			        {
			          "@@type": "ref",
			          "id": "test/a:2",
			        },
			        {
			          "@@type": "ref",
			          "id": "test/a:3",
			        },
			      ],
			    },
			    "oid": "test/a:1",
			    "timestamp": "4",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "foo": {
			          "@@type": "ref",
			          "id": "test/a:0",
			        },
			        "qux": {
			          "@@type": "ref",
			          "id": "test/a:1",
			        },
			      },
			    },
			    "oid": "test/a",
			    "timestamp": "5",
			  },
			]
		`);
	});
});

describe('applying individual operations', () => {
	it('applies a list-remove of only the last instance', () => {
		expect(
			applyPatch(['a', 'b', 'c', 'a', 'b'], {
				op: 'list-remove',
				value: 'a',
				only: 'last',
			}),
		).toEqual(['a', 'b', 'c', 'b']);
	});
	it('applies a list-remove of only the first instance', () => {
		expect(
			applyPatch(['a', 'b', 'c', 'a', 'b'], {
				op: 'list-remove',
				value: 'a',
				only: 'first',
			}),
		).toEqual(['b', 'c', 'a', 'b']);
	});
	it('applies a list-remove of all instances', () => {
		expect(
			applyPatch(['a', 'b', 'c', 'a', 'b'], {
				op: 'list-remove',
				value: 'a',
			}),
		).toEqual(['b', 'c', 'b']);
	});
	it('applies a list-remove of an object ref', () => {
		expect(
			applyPatch(
				[
					createRef('a'),
					createRef('b'),
					createRef('c'),
					createRef('a'),
					createRef('b'),
				],
				{
					op: 'list-remove',
					value: createRef('a'),
					only: 'last',
				},
			),
		).toEqual([createRef('a'), createRef('b'), createRef('c'), createRef('b')]);
	});
	it('applies a list-add of a nonexistent item', () => {
		expect(
			applyPatch(['a', 'b', 'c'], {
				op: 'list-add',
				value: 'd',
			}),
		).toEqual(['a', 'b', 'c', 'd']);
	});
	it('does not apply a list-add if the item is already present', () => {
		expect(
			applyPatch(['a', 'b', 'c'], {
				op: 'list-add',
				value: 'b',
			}),
		).toEqual(['a', 'b', 'c']);
	});
	it('applies list-move-by-index', () => {
		expect(
			applyPatch(['a', 'b', 'c', 'd'], {
				op: 'list-move-by-index',
				from: 0,
				to: 2,
			}),
		).toEqual(['b', 'c', 'a', 'd']);
	});
	it('applies list-move-by-ref', () => {
		expect(
			applyPatch(
				[createRef('a'), createRef('b'), createRef('c'), createRef('d')],
				{
					op: 'list-move-by-ref',
					value: createRef('a'),
					index: 2,
				},
			),
		).toEqual([createRef('b'), createRef('c'), createRef('a'), createRef('d')]);
	});
});

describe('collecting deleted refs during patch application', () => {
	it('collects refs that are removed from a list', () => {
		const refs: (ObjectRef | FileRef)[] = [];
		expect(
			applyPatch(
				[
					createRef('a'),
					createRef('b'),
					createRef('c'),
					createRef('d'),
					createRef('e'),
				],
				{
					op: 'list-remove',
					value: createRef('c'),
				},
				refs,
			),
		).toEqual([createRef('a'), createRef('b'), createRef('d'), createRef('e')]);
		expect(refs).toEqual([createRef('c')]);
	});
	it('collects a deleted ref field from an object', () => {
		const refs: (ObjectRef | FileRef)[] = [];
		expect(
			applyPatch(
				{
					a: createRef('a'),
					b: createRef('b'),
					c: createRef('c'),
				},
				{
					op: 'remove',
					name: 'b',
				},
				refs,
			),
		).toEqual({
			a: createRef('a'),
			c: createRef('c'),
		});
		expect(refs).toEqual([createRef('b')]);
	});
	it('collects all refs in a deleted object', () => {
		const refs: (ObjectRef | FileRef)[] = [];
		expect(
			applyPatch(
				{
					a: createRef('a'),
					b: createRef('b'),
					c: createRef('c'),
				},
				{
					op: 'delete',
				},
				refs,
			),
		).toEqual(undefined);
		expect(refs).toEqual([createRef('a'), createRef('b'), createRef('c')]);
	});
	it('collects all refs in a deleted list', () => {
		const refs: (ObjectRef | FileRef)[] = [];
		expect(
			applyPatch(
				[createRef('a'), createRef('b'), createRef('c')],
				{
					op: 'delete',
				},
				refs,
			),
		).toEqual(undefined);
		expect(refs).toEqual([createRef('a'), createRef('b'), createRef('c')]);
	});
	it('collects a ref in a replaced field', () => {
		const refs: (ObjectRef | FileRef)[] = [];
		expect(
			applyPatch(
				{
					a: createRef('a'),
					b: createRef('b'),
					c: createRef('c'),
				},
				{
					op: 'set',
					name: 'b',
					value: createRef('d'),
				},
				refs,
			),
		).toEqual({
			a: createRef('a'),
			b: createRef('d'),
			c: createRef('c'),
		});
		expect(refs).toEqual([createRef('b')]);
	});
});
