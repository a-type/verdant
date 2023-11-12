/**
 * This exists since I'm a little anxious about using WeakRef in production
 * and want to be able to roll it back quickly to debug issues. Basically by adding
 * import { WeakRef } from 'FakeWeakRef' to the top of the file, we can switch back
 * to using a simple object reference.
 */

export class FakeWeakRef<T extends WeakKey> {
	constructor(value: T) {
		this.value = value;
	}

	value: T;

	deref(): T | undefined {
		return this.value;
	}
}
