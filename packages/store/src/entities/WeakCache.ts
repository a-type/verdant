import { Context } from '../context.js';

/**
 * Adapted from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management#data_structures_aiding_memory_management
 */
export function makeWeakCache<T extends object>(
	getter: (key: string) => T,
	ctx: Context,
) {
	// A Map from string ids to WeakRefs of results
	const cache = new Map<string, WeakRef<T>>();
	// Every time after a value is garbage collected, the callback is
	// called with the key in the cache as argument, allowing us to remove
	// the cache entry
	const registry = new FinalizationRegistry<string>((key) => {
		// Note: it's important to test that the WeakRef is indeed empty.
		// Otherwise, the callback may be called after a new object has been
		// added with this key, and that new, alive object gets deleted
		if (!cache.get(key)?.deref()) {
			cache.delete(key);
		}
	});
	return (key: string) => {
		let value = cache.get(key)?.deref();
		if (value) {
			return value;
		}
		value = getter(key);
		cache.set(key, ctx.weakRef(value));
		registry.register(value, key);
		return value;
	};
}
