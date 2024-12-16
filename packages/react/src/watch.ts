import { Entity, EntityFile } from '@verdant-web/store';
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';

const OBSERVATION_INFO = Symbol('OBSERVATION_INFO');

type ObservationInfo = {
	accessedKeys: Set<string>;
	accessedIndex: boolean;
};

// largely inspired by Valtio (https://github.com/pmndrs/valtio/blob/main/src/react.ts)
export function useWatch(
	entity: Entity | EntityFile | null,
	options?: { deep?: boolean; untracked?: boolean },
) {
	const lastSnapshot = useRef<ProxiedDestructure | null>(null);
	const observationInfo = useMemo(
		() => ({ accessedKeys: new Set<string>(), accessedIndex: false }),
		[entity],
	);

	const currSnapshot = useSyncExternalStore(
		(handler) => {
			if (entity) {
				// this may seem superfluous but TS can't infer that
				// both types have the same event key.
				if ('isFile' in entity) {
					return entity.subscribe('change', handler);
				} else {
					if (options?.deep) {
						return entity.subscribe('changeDeep', handler);
					}
					return entity.subscribe('change', handler);
				}
			}

			return () => {};
		},
		() => {
			if (!entity) {
				return null;
			}
			if ('isFile' in entity) {
				return entity.url;
			}

			// if deep is true, always re-render. otherwise, if we don't have a
			// prior snapshot, always re-render.
			const prevSnapshot = lastSnapshot.current;
			if (options?.deep || options?.untracked || !prevSnapshot) {
				return entity.getAll();
			}

			// if prior snapshot is equal to current, we don't have to check for changes;
			// we know they're identical. Entity returns a new object reference on change,
			// but keeps the old one if nothing changed.
			const destructured = entity.getAll();
			if (prevSnapshot === destructured) {
				return prevSnapshot;
			}

			// check for changes to observed values
			if (hasObservedChanged(observationInfo, prevSnapshot, destructured)) {
				return destructured;
			}

			return prevSnapshot;
		},
		() => {
			if (!entity) return null;
			if ('isFile' in entity) return entity.url;
			return entity.getAll();
		},
	);

	useLayoutEffect(() => {
		if (typeof currSnapshot !== 'string') {
			lastSnapshot.current = currSnapshot;
		}
	});

	if (currSnapshot && typeof currSnapshot !== 'string') {
		return createProxy(currSnapshot, observationInfo);
	}
	return currSnapshot;
}

type ProxiedDestructure = {
	[OBSERVATION_INFO]: { accessedKeys: Set<string>; accessedIndex: boolean };
	[key: string]: any;
};

function createProxy(
	destructured: any,
	observationInfo: ObservationInfo,
): ProxiedDestructure {
	const proxy = new Proxy(destructured, {
		get(target, key, receiver) {
			if (key === OBSERVATION_INFO) {
				return observationInfo;
			}

			if (typeof key === 'number') {
				observationInfo.accessedIndex = true;
			} else if (typeof key === 'string') {
				observationInfo.accessedKeys.add(key);
			}

			return Reflect.get(target, key, receiver);
		},
	});

	return proxy as ProxiedDestructure;
}

function hasObservedChanged(
	observationInfo: ObservationInfo,
	prev: any,
	next: any,
) {
	// if index was accessed, re-render on any change.
	if (observationInfo.accessedIndex) {
		return true;
	}

	// if no keys were accessed, we just always re-render on change. this is relevant
	// to the nullable document usage patterns -- the user may not even
	// store a reference to the returned value, so we can't track changes.
	if (observationInfo.accessedKeys.size === 0) {
		return true;
	}

	// otherwise, compare values of accessed keys.
	for (const key of observationInfo.accessedKeys) {
		if (prev[key] !== next[key]) {
			return true;
		}
	}

	return false;
}
