import { CollectionIndexFilter, StorageSchema } from '@lo-fi/common';
import { Query, Storage, StorageDescriptor, UserInfo } from '@lo-fi/web';
import { Entity } from '@lo-fi/web/src/reactives/Entity.js';
import { SyncTransportMode } from '@lo-fi/web/src/sync/Sync.js';
import {
	Context,
	createContext,
	Provider,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from 'react';
import { suspend } from 'suspend-react';
import { useSyncExternalStore } from 'use-sync-external-store';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector.js';

function useLiveQuery(liveQuery: Query<any> | null) {
	if (liveQuery) {
		suspend(() => liveQuery.resolved, [liveQuery]);
	}
	return useSyncExternalStore(
		(callback) => {
			if (liveQuery) {
				return liveQuery.subscribe(callback);
			} else {
				return () => {};
			}
		},
		() => {
			return liveQuery ? liveQuery.current : null;
		},
	);
}

function capitalize<T extends string>(str: T) {
	return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

export function createHooks<Presence = any, Profile = any>(
	schema: StorageSchema<any>,
) {
	const Context = createContext<StorageDescriptor<Presence, Profile> | null>(
		null,
	);

	function useStorage() {
		const ctx = useContext(Context);
		if (!ctx) {
			throw new Error('No lo-fi provider was found');
		}
		return suspend(() => ctx.readyPromise, ['lofi_' + ctx.namespace]);
	}

	function useWatch(liveObject: Entity | null, prop?: any) {
		return useSyncExternalStore(
			(handler) => {
				if (liveObject) {
					return liveObject.subscribe('change', handler);
				}
				return () => {};
			},
			() => {
				if (liveObject) {
					if (prop) {
						return liveObject.get(prop);
					}

					return liveObject.getAll();
				}

				return undefined;
			},
		);
	}

	function useSelf() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.sync.presence.subscribe('selfChanged', callback),
			() => storage.sync.presence.self,
		);
	}

	function usePeerIds() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.sync.presence.subscribe('peersChanged', callback),
			() => storage.sync.presence.peerIds,
		);
	}

	function usePeer(peerId: string | null) {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => {
				const unsubs: (() => void)[] = [];
				unsubs.push(
					storage.sync.presence.subscribe('peerChanged', (id, user) => {
						if (id === peerId) {
							callback();
						}
					}),
				);
				unsubs.push(
					storage.sync.presence.subscribe('peerLeft', (id) => {
						if (id === peerId) {
							callback();
						}
					}),
				);

				return () => {
					unsubs.forEach((unsub) => unsub());
				};
			},
			() => (peerId ? storage.sync.presence.peers[peerId] ?? null : null),
		);
	}

	function useFindPeer(
		query: (peer: UserInfo<any, any>) => boolean,
		options?: { includeSelf: boolean },
	) {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => {
				const unsubs: (() => void)[] = [];
				unsubs.push(
					storage.sync.presence.subscribe('peerChanged', (id, user) => {
						if (query(user)) {
							callback();
						}
					}),
				);
				unsubs.push(
					storage.sync.presence.subscribe('peerLeft', (id) => {
						if (query(storage.sync.presence.peers[id])) {
							callback();
						}
					}),
				);
				if (options?.includeSelf) {
					unsubs.push(
						storage.sync.presence.subscribe('selfChanged', (user) => {
							if (query(user)) {
								callback();
							}
						}),
					);
				}

				return () => {
					unsubs.forEach((unsub) => unsub());
				};
			},
			() => {
				const peers = Object.values(storage.sync.presence.peers);
				if (options?.includeSelf) {
					peers.push(storage.sync.presence.self);
				}
				return peers.find(query) || null;
			},
		);
	}

	function useFindPeers(
		query: (peer: UserInfo<any, any>) => boolean,
		options?: { includeSelf: boolean },
	) {
		const storage = useStorage();
		return useSyncExternalStoreWithSelector(
			(callback) => {
				const unsubs: (() => void)[] = [];
				unsubs.push(
					storage.sync.presence.subscribe('peerChanged', (id, user) => {
						if (query(user)) {
							callback();
						}
					}),
				);
				unsubs.push(
					storage.sync.presence.subscribe('peerLeft', (id) => {
						callback();
					}),
				);
				if (options?.includeSelf) {
					unsubs.push(
						storage.sync.presence.subscribe('selfChanged', (user) => {
							if (query(user)) {
								callback();
							}
						}),
					);
				}

				return () => {
					unsubs.forEach((unsub) => unsub());
				};
			},
			() => {
				const peers = Object.values(storage.sync.presence.peers).filter(
					Boolean,
				);
				if (options?.includeSelf) {
					peers.push(storage.sync.presence.self);
				}
				return peers.filter(query);
			},
			() => [] as UserInfo<any, any>[],
			(peers) => peers,
			(a, b) => a.length === b.length && a.every((peer, i) => peer === b[i]),
		);
	}

	function useSyncStatus() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.sync.subscribe('onlineChange', callback),
			() => storage.sync.isConnected,
		);
	}

	function useCanUndo() {
		const storage = useStorage();

		return useSyncExternalStore(
			(callback) => storage.undoHistory.subscribe('change', callback),
			() => storage.undoHistory.canUndo,
		);
	}

	function useCanRedo() {
		const storage = useStorage();
		return useSyncExternalStore(
			(callback) => storage.undoHistory.subscribe('change', callback),
			() => storage.undoHistory.canRedo,
		);
	}

	function useUnsuspendedClient() {
		const desc = useContext(Context);

		const client = desc?.current;

		const [_, forceUpdate] = useReducer((s) => s + 1, 0);
		if (desc && !client) {
			desc.readyPromise.then(forceUpdate);
		}

		return client || null;
	}

	/**
	 * Non-suspending hook which allows declarative sync start/stop
	 * control.
	 *
	 * You can optionally configure parameters as part of this as well.
	 */
	function useSync(
		isOn: boolean,
		config: { mode?: SyncTransportMode; pullInterval?: number } = {},
	) {
		const client = useUnsuspendedClient();

		useEffect(() => {
			if (client) {
				if (isOn) {
					client.sync.start();
				} else {
					client.sync.stop();
				}
			}
		}, [client, isOn]);

		useEffect(() => {
			if (client) {
				if (config.mode !== undefined) {
					client.sync.setMode(config.mode);
				}
			}
		}, [client, config.mode]);

		useEffect(() => {
			if (client) {
				if (config.pullInterval !== undefined) {
					client.sync.setPullInterval(config.pullInterval);
				}
			}
		}, [client, config.pullInterval]);
	}

	function SyncController({ isOn }: { isOn: boolean }) {
		useSync(isOn);
		return null;
	}

	const hooks: Record<string, any> = {
		useStorage,
		useClient: useStorage,
		useUnsuspendedClient,
		useWatch,
		useSelf,
		usePeerIds,
		usePeer,
		useFindPeer,
		useFindPeers,
		useSyncStatus,
		useCanUndo,
		useCanRedo,
		useSync,
		Context,
		Provider: ({
			value,
			children,
			sync,
			...rest
		}: {
			children?: ReactNode;
			value: StorageDescriptor;
			sync?: boolean;
		}) => {
			// auto-open storage when used in provider
			useMemo(() => {
				value.open();
			}, [value]);
			return (
				<Context.Provider value={value} {...rest}>
					{children}
					{sync !== undefined && <SyncController isOn={sync} />}
				</Context.Provider>
			);
		},
	};

	const collectionNames = Object.keys(schema.collections);
	for (const name of collectionNames) {
		const collection = schema.collections[name];
		const getOneHookName = `use${capitalize(collection.name)}`;
		hooks[getOneHookName] = function useIndividual(
			id: string,
			{ skip }: { skip?: boolean } = {},
		) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return skip ? null : storage.get(name, id);
			}, [id, skip]);
			const data = useLiveQuery(liveQuery);

			return data;
		};

		const findOneHookName = `useOne${capitalize(collection.name)}`;
		hooks[findOneHookName] = function useOne({
			skip,
			index,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
		} = {}) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return skip ? null : (storage as any).findOne(name, index);
			}, [index, skip]);
			const data = useLiveQuery(liveQuery);
			return data;
		};

		const getAllHookName = `useAll${capitalize(
			collection.pluralName || collection.name + 's',
		)}`;
		hooks[getAllHookName] = function useAll({
			index,
			skip,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
		} = {}) {
			const storage = useStorage();
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() => (skip ? null : (storage as any).findAll(name, index)),
				[index, skip],
			);
			const data = useLiveQuery(liveQuery);
			return data || [];
		};
	}
	return hooks as any;
}
