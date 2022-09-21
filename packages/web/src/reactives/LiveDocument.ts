import {
	createAssignPatch,
	createListMovePatch,
	createListPushPatch,
	createPatch,
	SyncPatchDiff,
} from '@lofi/common';
import { DocumentMutations } from './DocumentCache.js';

// easier for testing things :/
const DEBUG = false;
function debugLog(...args: any[]) {
	if (DEBUG) {
		console.log(...args);
	}
}

// internal assignment - applies updated document view to the live document
// after storage updates have been applied
export const LIVE_DOCUMENT_ASSIGN = Symbol('@@live-document-assign');
// exposes the subscription function for the live document
export const LIVE_DOCUMENT_SUBSCRIBE = Symbol('@@live-document-subscribe');
// allows getting the raw value from the proxy
export const LIVE_DOCUMENT_RAW = Symbol('@@live-document-raw');

const LIVE_DOCUMENT_UPDATE = '$update';
const LIVE_DOCUMENT_COMMIT = '$commit';
const LIVE_LIST_PUSH = '$push';
const LIVE_LIST_MOVE = '$move';

export type LiveObject<T> = LiveifyProperties<T> & {
	[LIVE_DOCUMENT_UPDATE]: (values: Partial<T>) => void;
	[LIVE_DOCUMENT_COMMIT]: () => void;
};

export type LiveArray<T> = {
	[index: number]: LiveifyProperties<T>;
	length: number;
	[LIVE_LIST_PUSH]: (item: T) => void;
	[LIVE_LIST_MOVE]: (from: number, to: number) => void;
};

type Liveify<T> = T extends Array<any>
	? LiveArray<T[number]>
	: T extends object
	? LiveObject<T>
	: T;
type LiveifyProperties<T> = {
	[K in keyof T]: Liveify<T[K]>;
};

export type LiveDocument<T> = LiveObject<T>;

export function subscribe<T extends Record<string | symbol, any>>(
	obj: T,
	callback: (value: T | null) => void,
) {
	if (!obj[LIVE_DOCUMENT_SUBSCRIBE]) {
		throw new Error('Cannot subscribe to a non-live object: ' + obj);
	}
	return obj[LIVE_DOCUMENT_SUBSCRIBE](callback);
}

export function assign(obj: any, value: any) {
	if (!obj[LIVE_DOCUMENT_ASSIGN]) {
		throw new Error('Cannot set a non-live object');
	}
	obj[LIVE_DOCUMENT_ASSIGN](value);
}

export function getRaw(obj: any) {
	if (!obj[LIVE_DOCUMENT_RAW]) {
		throw new Error('Cannot get raw value from non-live object');
	}
	return obj[LIVE_DOCUMENT_RAW];
}

export interface LiveDocumentContext {
	id: string;
	mutations: DocumentMutations;
}

export function createLiveDocument<T extends object>({
	initial,
	context,
	dispose,
}: {
	initial: T;
	context: LiveDocumentContext;
	dispose: () => void;
}): LiveDocument<T> {
	return createLiveObject({
		initial,
		context,
		keyPath: [],
		dispose,
	});
}

function createSubscribe<T>(ref: { current: T }, dispose: () => void) {
	const subscribers = new Set<(value: T) => void>();
	function subscribe(callback: (value: T) => void) {
		subscribers.add(callback);
		return () => {
			subscribers.delete(callback);
			if (subscribers.size === 0) {
				// enqueue a microtask to wait for any new subscribers
				// before disposing the object
				queueMicrotask(() => {
					if (subscribers.size === 0) {
						dispose();
					}
				});
			}
		};
	}

	function trigger() {
		for (const subscriber of subscribers) {
			subscriber(ref.current);
		}
	}

	return {
		subscribe,
		trigger,
	};
}

function createLiveArray<T>({
	initial,
	keyPath,
	dispose,
	context,
}: {
	initial: T[];
	keyPath: (string | number | symbol)[];
	dispose: () => void;
	context: LiveDocumentContext;
}): LiveArray<T> {
	const ref = { current: initial, updated: undefined as T[] | undefined };

	const wrappedProperties: Liveify<T>[] = [];

	const { subscribe, trigger } = createSubscribe(ref, dispose);

	function setSource(value: T[]) {
		debugLog('array setsource', value);
		for (let i = 0; i < value.length; i++) {
			if (wrappedProperties[i]) {
				assign(wrappedProperties[i], value[i]);
			}
			ref.current[i] = value[i];
		}
		ref.updated = undefined;
		trigger();
	}

	// a list of updates which have been made via object mutations
	// that have yet to be flushed to storage
	const pendingUpdates = new Array<SyncPatchDiff>([]);
	let updatesQueued = false;

	function enqueueUpdates() {
		if (!updatesQueued) {
			queueMicrotask(applyUpdates);
			updatesQueued = true;
		}
	}

	// creates a new update set and closes the current one. this
	// creates a new atomic operation which is applied separately
	// from any prior updates this frame.
	function commit() {
		if (pendingUpdates[pendingUpdates.length - 1].length > 0) {
			pendingUpdates.push([]);
		}
	}

	function push(item: T) {
		ref.updated = ref.updated || [...ref.current];
		ref.updated.push(item);
		debugLog('pushed', ref.updated);
		pendingUpdates[0].push(...createListPushPatch(item, keyPath));
		enqueueUpdates();
	}

	function move(from: number, to: number) {
		ref.updated = ref.updated || [...ref.current];
		ref.updated.splice(to, 0, ref.updated.splice(from, 1)[0]);
		pendingUpdates[0].push(...createListMovePatch(from, to, keyPath));
		enqueueUpdates();
	}

	function set(value: T, index: number) {
		ref.updated = ref.updated || [...ref.current];
		ref.updated[index] = value;
		pendingUpdates[0].push(...createAssignPatch(value, index, keyPath));
		enqueueUpdates();
	}

	function applyUpdates() {
		if (pendingUpdates.length === 0) {
			return;
		}
		context.mutations.applyOperations(
			pendingUpdates.map((patch) => ({
				documentId: context.id,
				patch,
			})),
		);
		updatesQueued = false;
	}

	return new Proxy([] as any, {
		get: (_, key) => {
			const name = key as keyof T;
			if (name === LIVE_DOCUMENT_ASSIGN) {
				return setSource;
			}
			if (name === LIVE_DOCUMENT_SUBSCRIBE) {
				return subscribe;
			}
			if (name === LIVE_DOCUMENT_RAW) {
				return ref.current;
			}

			if (key === LIVE_DOCUMENT_COMMIT) {
				return commit;
			}

			if (key === LIVE_LIST_PUSH) {
				return push;
			}

			if (key === LIVE_LIST_MOVE) {
				return move;
			}

			// override the iterator
			if (key === Symbol.iterator) {
				return function* () {
					for (const item of ref.updated || ref.current) {
						yield wrappedProperty<any, any>(name, item, {
							wrappedProperties,
							context,
							keyPath,
						});
					}
				} as any;
			}

			if (key === 'toString') {
				return () => JSON.stringify(ref.updated ?? ref.current);
			}

			if (key === 'getOwnPropertyNames') {
				return () => Object.getOwnPropertyNames(ref.updated ?? ref.current);
			}

			if (key === 'length') {
				return (ref.updated ?? ref.current).length;
			}

			const value = ref.updated
				? Reflect.get(ref.updated, name)
				: Reflect.get(ref.current, name);
			debugLog('array get', name, value, ref.updated, ref.current);
			return wrappedProperty<any, any>(name, value, {
				wrappedProperties,
				context,
				keyPath,
			});
		},
		set: (target, key, value) => {
			if (typeof key === 'number') {
				set(value, key);
				return true;
			}
			throw new Error('Assignment not supported');
		},
	});
}

function createLiveObject<T extends object>({
	initial,
	keyPath,
	dispose,
	context,
}: {
	initial: T;
	keyPath: (string | number | symbol)[];
	dispose: () => void;
	context: LiveDocumentContext;
}): LiveObject<T> {
	const allowedKeys = Object.keys(initial) as any[];

	const ref: { current: T; updated: T | undefined } = {
		current: initial,
		updated: undefined,
	};

	const wrappedProperties: {
		[k in keyof T]?: Liveify<T[k]>;
	} = {};

	const { subscribe, trigger } = createSubscribe(ref, dispose);

	function setSource(value: T | null) {
		if (value === null) {
			ref.current = null as any;
			dispose();
		} else {
			// recursively assign properties to the source.
			for (const key in value) {
				if (wrappedProperties[key]) {
					assign(wrappedProperties[key], value[key]);
				}
				ref.current[key] = value[key];
			}
		}
		// reset updated
		ref.updated = undefined;

		trigger();
	}

	// a list of updates which have been made via object mutations
	// that have yet to be flushed to storage
	let pendingUpdates = new Array<SyncPatchDiff>([]);
	let updatesQueued = false;

	function enqueueUpdates() {
		if (!updatesQueued) {
			queueMicrotask(applyUpdates);
			updatesQueued = true;
		}
	}
	// creates a new update set and closes the current one. this
	// creates a new atomic operation which is applied separately
	// from any prior updates this frame.
	function commit() {
		if (pendingUpdates[pendingUpdates.length - 1].length > 0) {
			pendingUpdates.push([]);
		}
	}
	// applies a patch to the current object and enqueues it for
	// storage update
	function update(values: Partial<T>) {
		ref.updated = { ...ref.current, ...values };
		const patch = createPatch(ref.current, ref.updated, keyPath);
		pendingUpdates[pendingUpdates.length - 1].push(...patch);
		enqueueUpdates();
	}

	function set(value: T[keyof T], key: keyof T) {
		ref.updated = ref.updated || { ...ref.current };
		ref.updated[key] = value;
		pendingUpdates[pendingUpdates.length - 1].push(
			...createAssignPatch(value, key, keyPath),
		);
		enqueueUpdates();
	}

	function applyUpdates() {
		if (pendingUpdates.length === 0) {
			return;
		}
		context.mutations.applyOperations(
			pendingUpdates.map((patch) => ({
				documentId: context.id,
				patch,
			})),
		);
		updatesQueued = false;
		pendingUpdates = [[]];
	}

	return new Proxy(ref as any, {
		get: (_, key) => {
			const name = key as keyof T;
			if (name === LIVE_DOCUMENT_ASSIGN) {
				return setSource;
			}
			if (name === LIVE_DOCUMENT_SUBSCRIBE) {
				return subscribe;
			}
			if (name === LIVE_DOCUMENT_RAW) {
				return ref.current;
			}

			if (key === LIVE_DOCUMENT_UPDATE) {
				return update;
			}

			if (key === LIVE_DOCUMENT_COMMIT) {
				return commit;
			}

			if (key === 'toString') {
				return () => JSON.stringify(ref.updated ?? ref.current);
			}

			if (key === 'getOwnPropertyNames') {
				return () => Object.getOwnPropertyNames(ref.updated ?? ref.current);
			}

			const value = ref.updated
				? Reflect.get(ref.updated, name)
				: Reflect.get(ref.current, name);
			return wrappedProperty<any, any>(name, value, {
				wrappedProperties,
				context,
				keyPath,
			});
		},
		set: (target, key, value) => {
			if (allowedKeys.includes(key)) {
				set(value, key as keyof T);
				return true;
			}
			throw new Error('Assignment not supported');
		},
		ownKeys: () => allowedKeys,
	});
}

function wrappedProperty<T extends any, K extends keyof T>(
	key: K,
	value: T[K],
	{
		wrappedProperties,
		context,
		keyPath,
	}: {
		wrappedProperties: any;
		keyPath: (string | number | symbol)[];
		context: LiveDocumentContext;
	},
) {
	if (typeof value === 'object' && value !== null) {
		if (wrappedProperties[key]) {
			return wrappedProperties[key];
		}
		if (Array.isArray(value)) {
			const array = createLiveArray({
				initial: value,
				context,
				keyPath: [...keyPath, key],
				dispose: () => {
					wrappedProperties[key] = undefined;
					delete wrappedProperties[key];
				},
			});
			wrappedProperties[key] = array;
			return array;
		}
		const obj = createLiveObject({
			initial: value as unknown as any,
			context,
			keyPath: [...keyPath, key],
			dispose: () => {
				wrappedProperties[key] = undefined;
				delete wrappedProperties[key];
			},
		});
		wrappedProperties[key] = obj;
		return obj;
	}
	return value;
}
