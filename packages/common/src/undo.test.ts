import { describe, expect, it } from 'vitest';
import { assignOid, createOid, createRef } from './oids.js';
import { PatchCreator } from './patch.js';
import { getUndoOperations } from './undo.js';

function createClock(start: number = 0) {
	let time = start;
	function clock() {
		return `${time++}`;
	}
	clock.reset = () => {
		time = start;
	};
	return clock;
}

describe('undo', () => {
	it('correctly removes added list items', () => {
		const clock = createClock();
		const patchCreator = new PatchCreator(clock, createClock());
		const initial = [1, 2];
		const oid = createOid('test', 'foo');
		const operations = patchCreator.createListSet(oid, 2, 3);
		clock.reset();
		const undos = getUndoOperations(oid, initial, operations, clock);
		clock.reset();
		expect(undos).toEqual(patchCreator.createListDelete(oid, 2, 1));
	});
	it('correctly restores removed items by ref', () => {
		const clock = createClock();
		const patchCreator = new PatchCreator(clock, createClock());
		const initial = assignOid(
			[createRef('test/a:1'), createRef('test/a:2'), createRef('test/a:3')],
			'test/a',
		);
		const operations = patchCreator.createListRemove(
			'test/a',
			initial[1],
			'last',
		);
		clock.reset();
		const undos = getUndoOperations('test/a', initial, operations, clock);
		clock.reset();
		expect(undos).toEqual(
			patchCreator.createListInsert('test/a', 1, initial[1]),
		);
	});
	it('undoes list insert with 1 item', () => {
		const clock = createClock();
		const patchCreator = new PatchCreator(clock, createClock());
		const initial = [1, 2];
		const oid = createOid('test', 'foo');
		const operations = patchCreator.createListInsert(oid, 1, 3);
		clock.reset();
		const undos = getUndoOperations(oid, initial, operations, clock);
		clock.reset();
		expect(undos).toEqual(patchCreator.createListDelete(oid, 1, 1));
	});
	it('undoes list insert with multiple items', () => {
		const clock = createClock();
		const patchCreator = new PatchCreator(clock, createClock());
		const initial = [1, 2];
		const oid = createOid('test', 'foo');
		const operations = patchCreator.createListInsertMany(oid, 1, [3, 4]);
		clock.reset();
		const undos = getUndoOperations(oid, initial, operations, clock);
		clock.reset();
		expect(undos).toEqual(patchCreator.createListDelete(oid, 1, 2));
	});
	it('undoes initialize with delete', () => {
		const clock = createClock();
		const patchCreator = new PatchCreator(clock, createClock());
		const initial = { foo: 'bar' };
		const oid = createOid('test', 'foo');
		const operations = patchCreator.createInitialize(initial, oid);
		clock.reset();
		const undos = getUndoOperations(oid, initial, operations, clock);
		clock.reset();
		expect(undos).toEqual(patchCreator.createDelete(oid));
	});
});
