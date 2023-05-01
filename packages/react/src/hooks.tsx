import { CollectionIndexFilter, StorageSchema } from '@lo-fi/common';
import {
	Query,
	SyncTransportMode,
	StorageDescriptor,
	UserInfo,
	Entity,
	ClientWithCollections,
	EntityFile,
	Client,
} from '@lo-fi/web';
import {
	createContext,
	ReactNode,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import { suspend } from 'suspend-react';
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

type HookName = `use${string}`;

export function createHooks<Presence = any, Profile = any>(
	schema: StorageSchema<any>,
) {
	const Context = createContext<StorageDescriptor<Presence, Profile> | null>(
		null,
	);

	function useStorage(): ClientWithCollections {
		const ctx = useContext(Context);
		if (!ctx) {
			throw new Error('No lo-fi provider was found');
		}
		return suspend(() => ctx.readyPromise, ['lofi_' + ctx.namespace]) as any;
	}

	function useWatch(liveObject: Entity | EntityFile | null, prop?: any) {
		return useSyncExternalStore(
			(handler) => {
				if (liveObject) {
					return (liveObject as any).subscribe('change', handler);
				}
				return () => {};
			},
			() => {
				if (liveObject) {
					if (liveObject instanceof EntityFile) {
						return liveObject.url;
					} else {
						if (prop) {
							return liveObject.get(prop);
						}

						return liveObject.getAll();
					}
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

	function useUndo() {
		const storage = useStorage();

		return useCallback(() => storage.undoHistory.undo(), [storage]);
	}

	function useRedo() {
		const storage = useStorage();

		return useCallback(() => storage.undoHistory.redo(), [storage]);
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

		const [_, forceUpdate] = useState(0);
		if (desc && !client) {
			desc.readyPromise.then(() => forceUpdate((n) => n + 1));
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
		useUndo,
		useRedo,
		useCanUndo,
		useCanRedo,
		useSync,
		Context,
		Provider: ({
			value,
			children,
			sync,
			suspenseFallback,
			...rest
		}: {
			children?: ReactNode;
			value: StorageDescriptor;
			sync?: boolean;
			suspenseFallback?: ReactNode;
		}) => {
			// auto-open storage when used in provider
			useMemo(() => {
				value.open();
			}, [value]);
			return (
				<Context.Provider value={value} {...rest}>
					<Suspense fallback={suspenseFallback || null}>
						{children}
						{sync !== undefined && <SyncController isOn={sync} />}
					</Suspense>
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
				return skip ? null : storage[name].get(id);
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
				return skip ? null : storage[name].findOne({ index });
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
				() => (skip ? null : storage[name].findAll({ index })),
				[index, skip],
			);
			const data = useLiveQuery(liveQuery);
			return data || [];
		};
		const getAllPaginatedHookName = `useAll${capitalize(
			collection.pluralName || collection.name + 's',
		)}Paginated`;
		hooks[getAllPaginatedHookName] = function useAllPaginated({
			index,
			skip,
			pageSize = 10,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			pageSize?: number;
		} = {}) {
			const storage = useStorage();
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() =>
					skip
						? null
						: storage[name].findPage({
								index,
								pageSize,
								page: 0,
						  }),
				[index, skip, pageSize],
			);
			const data = useLiveQuery(liveQuery);

			const tools = useMemo(
				() => ({
					next: () => liveQuery?.nextPage(),
					previous: () => liveQuery?.previousPage(),
					setPage: (page: number) => liveQuery?.setPage(page),

					get hasPrevious() {
						return liveQuery?.hasPreviousPage;
					},

					get hasNext() {
						return liveQuery?.hasNextPage;
					},
				}),
				[liveQuery],
			);

			return [data, tools] as const;
		};
		const getAllInfiniteHookName = `useAll${capitalize(
			collection.pluralName || collection.name + 's',
		)}Infinite`;
		hooks[getAllInfiniteHookName] = function useAllInfinite({
			index,
			skip,
			pageSize = 10,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			pageSize?: number;
		} = {}) {
			const storage = useStorage();
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() =>
					skip
						? null
						: storage[name].findAllInfinite({
								index,
								pageSize,
						  }),
				[index, skip, pageSize],
			);
			const data = useLiveQuery(liveQuery);

			const tools = useMemo(
				() => ({
					fetchMore: () => liveQuery?.loadMore(),

					get hasMore() {
						return liveQuery?.hasMore;
					},
				}),
				[liveQuery],
			);

			return [data, tools] as const;
		};
	}

	hooks.withMutations = <
		Mutations extends {
			[key: HookName]: (client: Client, ...args: any[]) => any;
		},
	>(
		mutations: Mutations,
	) => {
		const augmentedHooks = {
			...hooks,
		};
		for (const [name, subHook] of Object.entries(mutations)) {
			augmentedHooks[name] = (...args: any[]) => {
				const client = hooks.useClient();
				return subHook(client, ...args);
			};
		}
		return augmentedHooks;
	};

	return hooks as any;
}
