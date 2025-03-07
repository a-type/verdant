import { describe, expect, it } from 'vitest';
import { createOid } from './oids.js';
import { PatchCreator } from './patch.js';
import { getUndoOperations } from './undo.js';

describe('undo', () => {
	it('correctly removes added list items', () => {
		let time = 0;
		const clock = () => `time-${time++}`;
		let subId = 0;
		const patchCreator = new PatchCreator(clock, () => `${subId++}`);
		const initial = [1, 2];
		const oid = createOid('test', 'foo');
		const operations = patchCreator.createListSet(oid, 2, 3);
		time = 0;
		const undos = getUndoOperations(oid, initial, operations, clock);

		time = 0;
		expect(undos).toEqual(patchCreator.createListDelete(oid, 2, 1));
	});
});
