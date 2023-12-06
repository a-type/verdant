import { beforeAll, describe, expect, it } from 'vitest';
import { Registry } from './EntityRegistry.js';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';

describe.skip('Registry', () => {
	let gc: any;
	beforeAll(() => {
		setFlagsFromString('--expose_gc');
		gc = runInNewContext('gc');
	});

	it('receives a response for an object when a find call goes out', async () => {
		const registry = new Registry<MockEntity>();
		class MockEntity {
			constructor(public id: string) {
				registry.register(id, () => {
					const ref = new WeakRef(this);
					registry.announce(id, ref.deref());
				});
			}
		}

		// keep A in scope
		const mockA = new MockEntity('a');
		// create a scope to put these references in
		(function () {
			const mockB = new MockEntity('b');
			const mockC = new MockEntity('c');

			const foundA = registry.find('a');
			const foundB = registry.find('b');
			const foundC = registry.find('c');

			expect(foundA).toBe(mockA);
			expect(foundB).toBe(mockB);
			expect(foundC).toBe(mockC);
		})();

		// garbage collection should now be able to eliminate B and C
		gc();
		console.log('Manual gc', process.memoryUsage());

		await new Promise((resolve) => setTimeout(resolve, 1000));
		const foundA = registry.find('a');
		expect(foundA).toBe(mockA);

		expect(registry.find('b')).toBe(null);
		expect(registry.find('c')).toBe(null);
	});
});
