import { useMemo, useRef, useSyncExternalStore } from 'react';
import { suspend } from 'suspend-react';
import {
	Storage,
	Query,
	UserInfo,
	Entity,
	StorageDescriptor,
	ObjectEntity,
} from '@lo-fi/web';
import {
	CollectionIndexFilter,
	CollectionIndexName,
	SchemaCollectionName,
	StorageCollectionSchema,
	StorageSchema,
} from '@lo-fi/common';

type QueryHookResult<T> = T;

type PluralCapital<
	Name extends string,
	PluralName extends string | undefined,
> = PluralName extends string ? Capitalize<PluralName> : `${Capitalize<Name>}s`;

type CollectionHooks<
	Collection extends StorageCollectionSchema<any, any, any>,
> = {
	[key in Collection['name'] as `use${Capitalize<Collection['name']>}`]: (
		id: string,
	) => QueryHookResult<ObjectEntity<any>>;
} & {
	[key in Collection['name'] as `useAll${PluralCapital<
		Collection['name'],
		Collection['pluralName']
	>}`]: (config?: {
		index?: CollectionIndexFilter;
	}) => QueryHookResult<ObjectEntity<any>[]>;
} & {
	[key in Collection['name'] as `useOne${Capitalize<
		Collection['name']
	>}`]: (config?: {
		index?: CollectionIndexFilter;
	}) => QueryHookResult<ObjectEntity<any>>;
};

type UnionToIntersection<T> = (T extends any ? (k: T) => void : never) extends (
	k: infer U,
) => void
	? U
	: never;
type Flatten<T extends Record<string, any>> = T extends Record<string, infer V>
	? UnionToIntersection<V>
	: never;

type GeneratedHooks<
	Schema extends StorageSchema<{
		[k: string]: StorageCollectionSchema<any, any, any>;
	}>,
> = Flatten<{
	[CollectionName in Extract<
		keyof Schema['collections'],
		string
	>]: CollectionHooks<Schema['collections'][CollectionName]>;
}>;

function useLiveQuery(liveQuery: Query<any>) {
	suspend(() => liveQuery.resolved, [liveQuery.key]);
	return useSyncExternalStore(
		(callback) => {
			return liveQuery.subscribe(callback);
		},
		() => liveQuery.current,
	);
}

function capitalize<T extends string>(str: T) {
	return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

type CapitalizedCollectionName<
	Schema extends StorageSchema<{
		[k: string]: StorageCollectionSchema<any, any, any>;
	}>,
> = Capitalize<Extract<keyof Schema['collections'], string>>;

type CreatedHooks<
	Schema extends StorageSchema<{
		[k: string]: StorageCollectionSchema<any, any, any>;
	}>,
> = GeneratedHooks<Schema> & {
	useWatch<T>(liveObject: T): T;
	useSelf(): UserInfo;
	usePeerIds(): string[];
	usePeer(peerId: string): UserInfo;
	useSyncStatus(): boolean;
	useStorage(): Storage;
};

export function createHooks<
	Schema extends StorageSchema<{
		[k: string]: StorageCollectionSchema<any, any, any>;
	}>,
>(storageDesc: StorageDescriptor<Schema>): CreatedHooks<Schema> {
	function useStorage() {
		return suspend(() => storageDesc.readyPromise, ['rootStorage']);
	}

	function useWatch(liveObject: Entity) {
		return useSyncExternalStore(
			(handler) => liveObject.subscribe('change', handler),
			() => liveObject.getSnapshot(),
		);
	}

	function useSelf() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.presence.subscribe('selfChanged', callback),
			() => storage.presence.self,
		);
	}

	function usePeerIds() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.presence.subscribe('peersChanged', callback),
			() => storage.presence.peerIds,
		);
	}

	function usePeer(peerId: string) {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) =>
				storage.presence.subscribe('peerChanged', (id, user) => {
					if (id === peerId) {
						callback();
					}
				}),
			() => storage.presence.peers[peerId],
		);
	}

	function useSyncStatus() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.sync.subscribe('onlineChange', callback),
			() => storage.sync.active,
		);
	}

	const hooks: Record<string, any> = {
		useStorage,
		useWatch,
		useSelf,
		usePeerIds,
		usePeer,
		useSyncStatus,
	};

	const collectionNames = Object.keys(
		storageDesc.schema.collections,
	) as SchemaCollectionName<Schema>[];
	for (const name of collectionNames) {
		const collection = storageDesc.schema.collections[name];
		const getOneHookName = `use${capitalize(
			collection.name,
		)}` as `use${CapitalizedCollectionName<Schema>}`;
		hooks[getOneHookName] = function useOne(id: string) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return storage.get(name, id);
			}, [id]);
			const data = useLiveQuery(liveQuery);

			return data;
		};

		const findOneHookName = `useOne${capitalize(
			collection.name,
		)}` as `useOne${CapitalizedCollectionName<Schema>}`;
		hooks[findOneHookName] = function useOne(
			config: {
				index?: CollectionIndexFilter;
			} = {},
		) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return (storage as any).findOne(name, config.index);
			}, [config?.index]);
			const data = useLiveQuery(liveQuery);
			return data;
		};

		const getAllHookName = `useAll${capitalize(
			collection.pluralName || collection.name + 's',
		)}` as `useAll${CapitalizedCollectionName<Schema>}`;
		hooks[getAllHookName] = function useAll(
			config: {
				index?: CollectionIndexFilter;
			} = {},
		) {
			const storage = useStorage();
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = (storage as any).findAll(name, config.index);
			const data = useLiveQuery(liveQuery);
			return data;
		};
	}
	return hooks as any;
}
