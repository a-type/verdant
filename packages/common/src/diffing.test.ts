import { describe, expect, it } from 'vitest';
import { diffToPatches } from './diffing.js';
import { createFileRef } from './files.js';
import {
	assignOid,
	assignOidsToAllSubObjects,
	getOid,
	ObjectIdentifier,
} from './oids.js';
import {
	applyOperations,
	deconstructSnapshotToRefs,
	groupPatchesByOid,
	Operation,
	substituteRefsWithObjects,
} from './operation.js';
import { cloneDeep } from './utils.js';

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

function expectDiffProducesResult(from: any, patches: Operation[], to: any) {
	// all required sub-objects should either be present on the from object,
	// or represented by initialize operations in the patches. using these we can
	// reconstruct the final representation.
	const refTargets = new Map<ObjectIdentifier, any>();
	const fromCopy = cloneDeep(from); // retains OIDs
	deconstructSnapshotToRefs(fromCopy, refTargets);
	for (const patch of patches) {
		if (patch.data.op === 'initialize') {
			refTargets.set(patch.oid, patch.data.value);
		}
	}
	const fromOid = getOid(from);
	const fromRoot = refTargets.get(fromOid);
	expect(fromRoot).toBeDefined();
	const groupedPatches = groupPatchesByOid(patches);

	for (const [oid, ops] of Object.entries(groupedPatches)) {
		const target = refTargets.get(oid);
		expect(target).toBeDefined();
		refTargets.set(oid, applyOperations(target, ops));
	}

	// reconstruct the applied final object
	substituteRefsWithObjects(fromRoot, refTargets);
	expect(fromRoot).toEqual(to);
}

describe('generating diff operations', () => {
	describe('on flat objects', () => {
		it('generates and applies set and remove operations', () => {
			const from = { foo: 'bar', baz: 'qux', zing: 1 };
			assignOid(from, 'test/a');
			const to = { foo: 'bar', baz: 'pop' };
			assignOid(to, 'test/a');
			const ops = diffToPatches(from, to, createClock());
			expect(ops).toMatchInlineSnapshot(`
				[
				  {
				    "authz": undefined,
				    "data": {
				      "name": "baz",
				      "op": "set",
				      "value": "pop",
				    },
				    "oid": "test/a",
				    "timestamp": "0",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "name": "zing",
				      "op": "remove",
				    },
				    "oid": "test/a",
				    "timestamp": "1",
				  },
				]
			`);
			expectDiffProducesResult(from, ops, to);
		});
	});
	describe('on nested objects', () => {
		it('replaces whole nested objects', () => {
			const from = assignOid(
				{
					foo: 'bar',
					baz: assignOid({ qux: 'corge' }, 'test/a:0'),
				},
				'test/a',
			);
			const to = assignOid(
				{
					foo: 'bar',
					// NOTE: this object is assigned an OID. it's even one related to the
					// from object. but we still discard it. adding references to other
					// already-known objects to a different entity is not supported due
					// to the risk of having the same identity in multiple places
					baz: assignOid({ qux: 'grault' }, 'test/a:1'),
				},
				'test/a',
			);
			const patches = diffToPatches(from, to, createClock(), createClock(2));
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "data": {
				      "op": "initialize",
				      "value": {
				        "qux": "grault",
				      },
				    },
				    "oid": "test/a:2",
				    "timestamp": "0",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "name": "baz",
				      "op": "set",
				      "value": {
				        "@@type": "ref",
				        "id": "test/a:2",
				      },
				    },
				    "oid": "test/a",
				    "timestamp": "1",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "delete",
				    },
				    "oid": "test/a:0",
				    "timestamp": "2",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, to);
		});
		it('replaces whole nested objects with different ids even if fields are the same', () => {
			const from = {
				foo: 'bar',
				baz: { qux: { cat: 'corge' } },
			};
			assignOid(from, 'test/a');
			assignOid(from.baz, 'test/a:0');
			assignOid(from.baz.qux, 'test/a:1');
			const to = {
				foo: 'bar',
				baz: { qux: 'corge' },
			};
			assignOid(to, 'test/a');
			assignOid(to.baz, 'test/a:2');
			const patches = diffToPatches(from, to, createClock(), createClock(3));
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "data": {
				      "op": "initialize",
				      "value": {
				        "qux": "corge",
				      },
				    },
				    "oid": "test/a:3",
				    "timestamp": "0",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "name": "baz",
				      "op": "set",
				      "value": {
				        "@@type": "ref",
				        "id": "test/a:3",
				      },
				    },
				    "oid": "test/a",
				    "timestamp": "1",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "delete",
				    },
				    "oid": "test/a:0",
				    "timestamp": "2",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "delete",
				    },
				    "oid": "test/a:1",
				    "timestamp": "3",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, to);
		});
		it('does not replace objects with the same identity and same fields', () => {
			const from = {
				foo: 'bar',
				baz: { qux: 'corge' },
			};
			assignOid(from, 'test/a');
			assignOid(from.baz, 'test/a:0');
			const to = {
				foo: 'bar',
				baz: { qux: 'corge' },
			};
			assignOid(to, 'test/a');
			assignOid(to.baz, 'test/a:0');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toEqual([]);
		});
		it('patches sub-objects with same identity', () => {
			const from = {
				foo: 'bar',
				baz: { qux: 'corge' },
			};
			assignOid(from, 'test/a');
			assignOid(from.baz, 'test/a:0');
			const to = {
				foo: 'bar',
				baz: { qux: 'fig' },
			};
			assignOid(to, 'test/a');
			assignOid(to.baz, 'test/a:0');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "authz": undefined,
				    "data": {
				      "name": "qux",
				      "op": "set",
				      "value": "fig",
				    },
				    "oid": "test/a:0",
				    "timestamp": "0",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, to);
		});
		it('retains keys which are undefined in new object if merge is set', () => {
			const from = {
				foo: 'bar',
				baz: { qux: 'corge' },
			};
			assignOid(from, 'test/a');
			assignOid(from.baz, 'test/a:0');
			const to = {
				foo: 'bip',
			};
			assignOid(to, 'test/a');
			const patches = diffToPatches(from, to, createClock(), undefined, [], {
				merge: true,
				mergeUnknownObjects: true,
			});
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "authz": undefined,
				    "data": {
				      "name": "foo",
				      "op": "set",
				      "value": "bip",
				    },
				    "oid": "test/a",
				    "timestamp": "0",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, { ...from, ...to });
		});
		it('deletes old complex objects when theyre replaced by primitives', () => {
			const from = assignOid(
				{
					thing: { qux: { foo: 'bar' } },
				},
				'test/a',
			);
			assignOidsToAllSubObjects(from, createClock());
			const to = assignOid(
				{
					thing: 'foo',
				},
				'test/a',
			);
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "authz": undefined,
				    "data": {
				      "name": "thing",
				      "op": "set",
				      "value": "foo",
				    },
				    "oid": "test/a",
				    "timestamp": "0",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "delete",
				    },
				    "oid": "test/a:0",
				    "timestamp": "1",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "delete",
				    },
				    "oid": "test/a:1",
				    "timestamp": "2",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, to);
		});
	});
	describe('on lists of primitives', () => {
		it('pushes new items', () => {
			const from = assignOid([1, 2], 'test/a');
			const to = assignOid([1, 2, 3], 'test/a');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toEqual([
				{
					data: {
						op: 'list-push',
						value: 3,
					},
					oid: 'test/a',
					timestamp: '0',
				},
			] satisfies Operation[]);
			expectDiffProducesResult(from, patches, to);
		});

		it('inserts items when remaining list is equal', () => {
			const from = assignOid([1, 2, 4, 5], 'test/a');
			const to = assignOid([1, 2, 3, 4, 5], 'test/a');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toEqual([
				{
					authz: undefined,
					data: {
						index: 2,
						op: 'list-insert',
						value: 3,
					},
					oid: 'test/a',
					timestamp: '0',
				},
			] satisfies Operation[]);
			expectDiffProducesResult(from, patches, to);
		});

		it('does not insert items when remaining list is unequal', () => {
			const from = assignOid([1, 2, 4, 5, 6, 7], 'test/a');
			const to = assignOid([1, 2, 3, 8, 9, 10], 'test/a');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toEqual([
				{
					authz: undefined,
					data: {
						op: 'list-set',
						value: 3,
						index: 2,
					},
					oid: 'test/a',
					timestamp: '0',
				},
				{
					authz: undefined,
					data: {
						op: 'list-set',
						value: 8,
						index: 3,
					},
					oid: 'test/a',
					timestamp: '1',
				},
				{
					authz: undefined,
					data: {
						op: 'list-set',
						index: 4,
						value: 9,
					},
					oid: 'test/a',
					timestamp: '2',
				},
				{
					authz: undefined,
					data: {
						op: 'list-set',
						index: 5,
						value: 10,
					},
					oid: 'test/a',
					timestamp: '3',
				},
			] satisfies Operation[]);
			expectDiffProducesResult(from, patches, to);
		});

		it('inserts items at the end of the new list if old list had more unmatched items at the end', () => {
			const from = assignOid([1, 2, 4, 5, 6, 7], 'test/a');
			const to = assignOid([1, 2, 3, 5, 8], 'test/a');
			const patches = diffToPatches(from, to, createClock());
			expect(patches).toEqual([
				{
					authz: undefined,
					data: {
						op: 'list-set',
						value: 3,
						index: 2,
					},
					oid: 'test/a',
					timestamp: '0',
				},
				{
					authz: undefined,
					data: {
						op: 'list-insert',
						value: 8,
						index: 4,
					},
					oid: 'test/a',
					timestamp: '1',
				},
				{
					authz: undefined,
					data: {
						op: 'list-delete',
						index: 5,
						count: 2,
					},
					oid: 'test/a',
					timestamp: '2',
				},
			] satisfies Operation[]);
			expectDiffProducesResult(from, patches, to);
		});
	});
	describe('on lists of objects', () => {
		it('pushes items', () => {
			const from = assignOid(
				[
					{ id: '1', value: 'Item one' },
					{ id: '2', value: 'Item two' },
				],
				'test/a',
			);
			assignOidsToAllSubObjects(from, createClock());
			const to = assignOid(
				[
					{ id: '1', value: 'Item one' },
					{ id: '2', value: 'Item two' },
					{ id: '3', value: 'Item three' },
				],
				'test/a',
			);
			assignOidsToAllSubObjects(to, createClock());
			const patches = diffToPatches(from, to, createClock(), createClock(2));
			expect(patches).toMatchInlineSnapshot(`
				[
				  {
				    "data": {
				      "op": "initialize",
				      "value": {
				        "id": "3",
				        "value": "Item three",
				      },
				    },
				    "oid": "test/a:2",
				    "timestamp": "0",
				  },
				  {
				    "authz": undefined,
				    "data": {
				      "op": "list-push",
				      "value": {
				        "@@type": "ref",
				        "id": "test/a:2",
				      },
				    },
				    "oid": "test/a",
				    "timestamp": "1",
				  },
				]
			`);
			expectDiffProducesResult(from, patches, to);
		});
		it.todo('moves objects by identity');
		it.todo('removes objects by identity');
	});
	describe.todo('on lists of lists', () => {
		it.todo('rejects operations by value or identity');
	});
	it('should work for complex nested arrays and objects', () => {
		const from = {
			foo: {
				bar: [1, 2, 3],
			},
			baz: [
				{
					corge: true,
				},
			],
		};
		assignOid(from, 'test/a');
		assignOid(from.foo, 'test/a:1');
		assignOid(from.foo.bar, 'test/a:2');
		assignOid(from.baz, 'test/a:3');
		assignOid(from.baz[0], 'test/a:4');

		const to = {
			foo: {
				bar: [1, 2],
				bop: [0],
			},
			baz: [
				{
					corge: false,
				},
				{
					corge: false,
				},
			],
		};
		assignOid(to, 'test/a');
		assignOid(to.foo, 'test/a:1');
		assignOid(to.foo.bar, 'test/a:2');
		assignOid(to.foo.bop, 'test/a:6');
		assignOid(to.baz, 'test/a:3');
		assignOid(to.baz[0], 'test/a:4');
		assignOid(to.baz[1], 'test/a:5');
		const patches = diffToPatches(from, to, createClock(), createClock(7));
		expect(patches).toMatchInlineSnapshot(`
			[
			  {
			    "authz": undefined,
			    "data": {
			      "count": 1,
			      "index": 2,
			      "op": "list-delete",
			    },
			    "oid": "test/a:2",
			    "timestamp": "0",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": [
			        0,
			      ],
			    },
			    "oid": "test/a:7",
			    "timestamp": "1",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "bop",
			      "op": "set",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:7",
			      },
			    },
			    "oid": "test/a:1",
			    "timestamp": "2",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "corge",
			      "op": "set",
			      "value": false,
			    },
			    "oid": "test/a:4",
			    "timestamp": "3",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "corge": false,
			      },
			    },
			    "oid": "test/a:8",
			    "timestamp": "4",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "op": "list-push",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:8",
			      },
			    },
			    "oid": "test/a:3",
			    "timestamp": "5",
			  },
			]
		`);
		expectDiffProducesResult(from, patches, to);
	});

	it('should try to merge unknown objects if specified to do so', () => {
		const from = {
			foo: {
				bar: [1, 2, 3],
			},
			baz: [
				{
					corge: true,
				},
			],
		};
		assignOid(from, 'test/a');
		assignOidsToAllSubObjects(from, createClock());

		const to = {
			foo: {
				bar: [1, 2],
				bop: [0],
			},
			baz: [
				{
					corge: false,
				},
				{
					corge: false,
				},
			],
		};
		const patches = diffToPatches(from, to, createClock(), createClock(5), [], {
			mergeUnknownObjects: true,
		});
		expect(patches).toMatchInlineSnapshot(`
			[
			  {
			    "authz": undefined,
			    "data": {
			      "count": 1,
			      "index": 2,
			      "op": "list-delete",
			    },
			    "oid": "test/a:1",
			    "timestamp": "0",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": [
			        0,
			      ],
			    },
			    "oid": "test/a:5",
			    "timestamp": "1",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "bop",
			      "op": "set",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:5",
			      },
			    },
			    "oid": "test/a:0",
			    "timestamp": "2",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "corge",
			      "op": "set",
			      "value": false,
			    },
			    "oid": "test/a:3",
			    "timestamp": "3",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "corge": false,
			      },
			    },
			    "oid": "test/a:6",
			    "timestamp": "4",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "op": "list-push",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:6",
			      },
			    },
			    "oid": "test/a:2",
			    "timestamp": "5",
			  },
			]
		`);
		expectDiffProducesResult(from, patches, to);
	});

	it('should not diff file refs', () => {
		const from = {
			foo: {
				file: createFileRef('abc123'),
			},
			bar: [createFileRef('def456'), createFileRef('ghi789')],
		};
		assignOid(from, 'test/a');
		assignOidsToAllSubObjects(from, createClock());

		const to = {
			foo: {
				file: createFileRef('abc456'),
			},
			bar: [createFileRef('def456')],
		};
		const patches = diffToPatches(from, to, createClock(), createClock(5), [], {
			mergeUnknownObjects: true,
		});
		expect(patches).toMatchInlineSnapshot(`
			[
			  {
			    "authz": undefined,
			    "data": {
			      "name": "file",
			      "op": "set",
			      "value": {
			        "@@type": "file",
			        "id": "abc456",
			      },
			    },
			    "oid": "test/a:0",
			    "timestamp": "0",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "count": 1,
			      "index": 1,
			      "op": "list-delete",
			    },
			    "oid": "test/a:1",
			    "timestamp": "1",
			  },
			]
		`);
		expectDiffProducesResult(from, patches, to);
	});

	it('should assign a new OID to objects which had an incompatible existing OID', () => {
		const from = {
			foo: {
				bar: [1, 2, 3],
			},
		};
		assignOid(from, 'test/a');
		assignOidsToAllSubObjects(from, createClock());
		const to = {
			foo: {
				bar: [1, 2],
			},
		};
		assignOid(to, 'test/a');
		assignOid(to.foo, 'uff/b');
		assignOidsToAllSubObjects(to.foo, createClock());
		const patches = diffToPatches(from, to, createClock(), createClock(5), [], {
			mergeUnknownObjects: true,
		});
		expect(patches).toMatchInlineSnapshot(`
			[
			  {
			    "data": {
			      "op": "initialize",
			      "value": [
			        1,
			        2,
			      ],
			    },
			    "oid": "test/a:6",
			    "timestamp": "0",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "bar": {
			          "@@type": "ref",
			          "id": "test/a:6",
			        },
			      },
			    },
			    "oid": "test/a:5",
			    "timestamp": "1",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "foo",
			      "op": "set",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:5",
			      },
			    },
			    "oid": "test/a",
			    "timestamp": "2",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "op": "delete",
			    },
			    "oid": "test/a:0",
			    "timestamp": "3",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "op": "delete",
			    },
			    "oid": "test/a:1",
			    "timestamp": "4",
			  },
			]
		`);
		expectDiffProducesResult(from, patches, to);
	});

	// an edge case - if a subobject which contains nested objects changes identity,
	// this gets written as a new init patch tree - we want to ensure all init subobjects
	// in that tree have compatible OIDs.
	it('should assign a new OID to objects which have an incompatible OID when parent identity changes', () => {
		const from = {
			bar: [],
		};
		assignOid(from, 'test/a');
		assignOid(from.bar, 'test/random');
		const to = {
			bar: [{ baz: 1 }, { baz: 2 }],
		};
		assignOid(to, 'test/a');
		assignOidsToAllSubObjects(to, createClock());
		assignOid(to.bar[0], 'uff/b');
		const patches = diffToPatches(from, to, createClock(), createClock(5), [], {
			mergeUnknownObjects: true,
		});
		expect(patches).toMatchInlineSnapshot(`
			[
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "baz": 1,
			      },
			    },
			    "oid": "test/a:6",
			    "timestamp": "0",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": {
			        "baz": 2,
			      },
			    },
			    "oid": "test/a:2",
			    "timestamp": "1",
			  },
			  {
			    "data": {
			      "op": "initialize",
			      "value": [
			        {
			          "@@type": "ref",
			          "id": "test/a:6",
			        },
			        {
			          "@@type": "ref",
			          "id": "test/a:2",
			        },
			      ],
			    },
			    "oid": "test/a:5",
			    "timestamp": "2",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "name": "bar",
			      "op": "set",
			      "value": {
			        "@@type": "ref",
			        "id": "test/a:5",
			      },
			    },
			    "oid": "test/a",
			    "timestamp": "3",
			  },
			  {
			    "authz": undefined,
			    "data": {
			      "op": "delete",
			    },
			    "oid": "test/random",
			    "timestamp": "4",
			  },
			]
		`);
		expectDiffProducesResult(from, patches, to);
	});
});
