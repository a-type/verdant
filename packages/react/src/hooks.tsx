import {
	CollectionIndexFilter,
	stableStringify,
	StorageSchema,
} from '@verdant-web/common';
import {
	Client,
	ClientWithCollections,
	Entity,
	Query,
	QueryStatus,
	StorageDescriptor,
	SyncTransportMode,
	UserInfo,
} from '@verdant-web/store';
import {
	ChangeEvent,
	createContext,
	HTMLProps,
	ReactNode,
	use,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { suspend } from 'suspend-react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector.js';
import { useOnChange, useWatch } from './watch.js';

function queryIsInitializing(query: Query<any>) {
	return query.status === 'initial' || query.status === 'initializing';
}
function useLiveQueryResult(
	liveQuery: Query<any> | null,
	disableSuspense = false,
) {
	// suspend if the query doesn't have a valid result set yet.
	if (!disableSuspense && liveQuery && queryIsInitializing(liveQuery)) {
		suspend(() => liveQuery.resolved, [liveQuery]);
	}
	return useSyncExternalStore(
		(callback) => {
			if (liveQuery) {
				return liveQuery.subscribe('change', callback);
			} else {
				return () => {};
			}
		},
		() => {
			return liveQuery ? liveQuery.current : null;
		},
	);
}
function useLiveQueryStatus(liveQuery: Query<any> | null): QueryStatus {
	return useSyncExternalStore(
		(callback) => {
			if (liveQuery) {
				return liveQuery.subscribe('statusChange', callback);
			} else {
				return () => {};
			}
		},
		() => {
			return liveQuery?.status ?? 'initial';
		},
	);
}

function capitalize<T extends string>(str: T) {
	return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

function useStableIndex(index: CollectionIndexFilter | undefined) {
	const indexRef = useRef(index);
	const mismatch = stableStringify(indexRef.current) !== stableStringify(index);
	if (mismatch) {
		indexRef.current = index;
	}
	return indexRef.current;
}

type HookName = `use${string}`;

export function createHooks<Presence = any, Profile = any>(
	schema: StorageSchema<any>,
	options: {
		/** you can provide your own context to use instead of the generated one */
		Context?: React.Context<StorageDescriptor<Presence, Profile> | null>;
	} = {},
) {
	const Context =
		options.Context ??
		createContext<StorageDescriptor<Presence, Profile> | null>(null);

	function useStorage(): ClientWithCollections {
		const ctx = use(Context);
		if (!ctx) {
			throw new Error('No verdant provider was found');
		}
		return suspend(
			() => ctx.readyPromise,
			[`verdant_${ctx.namespace}`],
		) as ClientWithCollections;
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
			() => (peerId ? (storage.sync.presence.peers[peerId] ?? null) : null),
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
						if (user && query(user)) {
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
				return peers.filter((p) => !!p).filter(query);
			},
			() => [] as UserInfo<any, any>[],
			(peers) => peers,
			(a, b) => a.length === b.length && a.every((peer, i) => peer === b[i]),
		);
	}

	/**
	 * Returns the peers that are in the same view as the local user.
	 */
	function useViewPeers() {
		const storage = useStorage();
		return useSyncExternalStoreWithSelector(
			(callback) => {
				return storage.sync.presence.subscribe('change', callback);
			},
			() => {
				const viewId = storage.sync.presence.self.internal.viewId;
				return Object.values(storage.sync.presence.peers).filter(
					(peer) => peer.internal.viewId === viewId,
				);
			},
			() => [] as UserInfo<any, any>[],
			(peers) => peers,
			(a, b) => a.length === b.length && a.every((peer, i) => peer === b[i]),
		);
	}

	function useViewId(viewId: string) {
		const client = useStorage();
		useEffect(() => {
			client.sync.presence.setViewId(viewId);
			return () => {
				client.sync.presence.setViewId(undefined);
			};
		}, [viewId, client]);
	}

	function useField(
		entity: Entity,
		key: string | number,
		{ timeout = 60 * 1000 }: { timeout?: number } = {},
	) {
		const fieldId = `${entity.uid}.${key}`;
		const value = useSyncExternalStore(
			(callback) => entity.subscribeToField(key, 'change', callback),
			() => entity.get(key),
		);

		const setValue = useCallback(
			(val: any) => entity.set(key, val),
			[entity, key],
		);

		const client = useStorage();
		const fieldPeers = useSyncExternalStoreWithSelector(
			(callback) => client.sync.presence.subscribe('peersChanged', callback),
			() => {
				return client.sync.presence.getFieldPeers(fieldId, timeout);
			},
			() => [] as UserInfo<any, any>[],
			(peers) => peers,
			(a, b) => {
				if (a.length !== b.length) return false;
				for (let i = 0; i < a.length; i++) {
					// looking for changes of peers or their lastFieldTimestamp
					if (a[i].replicaId !== b[i].replicaId) return false;
					if (
						a[i].internal.lastFieldTimestamp !==
						b[i].internal.lastFieldTimestamp
					) {
						return false;
					}
				}

				return true;
			},
		);
		const isPresenceOnField = useSyncExternalStore(
			(callback) => client.sync.presence.subscribe('selfChanged', callback),
			() => client.sync.presence.self.internal.lastFieldId === fieldId,
		);

		// set a timer for field peers to track when their claim expires. since expiration
		// is encoded in static timestamps, the component needs to re-render when the
		// earliest claim expires to check if it was renewed or if we should drop that
		// peer's presence on this field now. if this timer wasn't here, the component
		// may not re-render when a claim expires and it would remain indefinitely.
		const [_, forceUpdate] = useState(0);
		useEffect(() => {
			const earliestExpiration = fieldPeers.reduce(
				(earliest, peer) =>
					Math.min(earliest, peer.internal.lastFieldTimestamp ?? Infinity),
				Infinity,
			);
			if (earliestExpiration !== Infinity) {
				const time = earliestExpiration + timeout - Date.now() + 100;
				if (time < 0) {
					return;
				}

				const timer = setTimeout(() => {
					forceUpdate((n) => n + 1);
					// add a bit of buffer
				}, time);
				return () => {
					clearTimeout(timer);
				};
			}
		}, [fieldPeers, timeout]);

		const fieldPeersFilteredByTime = fieldPeers.filter(
			(value) =>
				value.internal.lastFieldTimestamp &&
				Date.now() - value.internal.lastFieldTimestamp < timeout,
		);

		const inputProps = useMemo(() => {
			const fieldSchema = entity.getFieldSchema(key);
			const fieldValue =
				fieldSchema.type === 'boolean'
					? key
					: value === null || value === undefined
						? ''
						: `${value}`;
			const props: HTMLProps<HTMLInputElement> = {
				onChange: (e: ChangeEvent<HTMLInputElement>) => {
					if (fieldSchema.type === 'number') {
						setValue(parseFloat(e.currentTarget.value));
					} else if (fieldSchema.type === 'boolean') {
						setValue(
							e.currentTarget.type === 'checkbox'
								? e.currentTarget.checked
								: e.currentTarget.value === 'true',
						);
					} else if (
						fieldSchema.type === 'string' ||
						fieldSchema.type === 'any'
					) {
						setValue(e.currentTarget.value);
					} else {
						throw new Error(
							'Unsupported field type ' +
								fieldSchema.type +
								' used by useField().inputProps for key ' +
								key +
								' of entity ' +
								entity.uid,
						);
					}
					client.sync.presence.setFieldId(fieldId);
				},
				onFocus: () => {
					client.sync.presence.setFieldId(fieldId);
				},
				onBlur: () => {
					client.sync.presence.setFieldId(undefined);
				},
				value: fieldValue,
			};
			if (fieldSchema.type === 'boolean') {
				props.type = 'checkbox';
				props.checked = !!value;
			}
			return props;
		}, [value, setValue, client, entity]);

		const occupied = fieldPeersFilteredByTime.length > 0 && !isPresenceOnField;

		return {
			value,
			setValue,
			inputProps,
			presence: {
				self: isPresenceOnField,
				peers: fieldPeersFilteredByTime,
				occupied,
				touch: () => client.sync.presence.setFieldId(fieldId),
			},
		};
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
		useEffect(() => {
			if (desc && !client) {
				desc.readyPromise.then(() => forceUpdate((n) => n + 1));
			}
		}, [desc, client]);

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
		useOnChange,
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
		useViewPeers,
		useViewId,
		useField,
		Context,
		Provider: ({
			value,
			children,
			sync,
			fallback,
			...rest
		}: {
			children?: ReactNode;
			value: StorageDescriptor;
			sync?: boolean;
			fallback?: ReactNode;
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
	for (const pluralName of collectionNames) {
		const collection = schema.collections[pluralName];
		const getOneHookName = `use${capitalize(collection.name)}`;
		hooks[getOneHookName] = function useIndividual(
			id: string,
			{ skip }: { skip?: boolean } = {},
		) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return skip ? null : storage[pluralName].get(id);
			}, [id, skip, storage]);
			const data = useLiveQueryResult(liveQuery);

			return data;
		};
		hooks[getOneHookName + 'Unsuspended'] = function useIndividualUnsuspended(
			id: string,
			{ skip }: { skip?: boolean } = {},
		) {
			const storage = useStorage();
			const liveQuery = useMemo(() => {
				return skip ? null : storage[pluralName].get(id);
			}, [id, skip, storage]);
			const data = useLiveQueryResult(liveQuery, true);
			const status = useLiveQueryStatus(liveQuery);

			return { data, status };
		};

		const findOneHookName = `useOne${capitalize(collection.name)}`;
		hooks[findOneHookName] = function useOne({
			skip,
			index: unstableIndex,
			key,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			key?: string;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			const liveQuery = useMemo(() => {
				return skip ? null : storage[pluralName].findOne({ index, key });
			}, [index, skip, storage, key]);
			const data = useLiveQueryResult(liveQuery);
			return data;
		};
		hooks[findOneHookName + 'Unsuspended'] = function useOneUnsuspended({
			skip,
			index: unstableIndex,
			key,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			key?: string;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			const liveQuery = useMemo(() => {
				return skip ? null : storage[pluralName].findOne({ index, key });
			}, [index, skip, storage, key]);
			const data = useLiveQueryResult(liveQuery, true);
			const status = useLiveQueryStatus(liveQuery);

			return { data, status };
		};

		const getAllHookName = `useAll${capitalize(pluralName)}`;
		hooks[getAllHookName] = function useAll({
			index: unstableIndex,
			skip,
			key,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			key?: string;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() => (skip ? null : storage[pluralName].findAll({ index, key })),
				[index, skip, storage, key],
			);
			const data = useLiveQueryResult(liveQuery);
			return data || [];
		};
		hooks[getAllHookName + 'Unsuspended'] = function useAllUnsuspended({
			index: unstableIndex,
			skip,
			key,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			key?: string;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() => (skip ? null : storage[pluralName].findAll({ index, key })),
				[index, skip, storage, key],
			);
			const data = useLiveQueryResult(liveQuery, true) || [];
			const status = useLiveQueryStatus(liveQuery);

			return { data, status };
		};

		const getAllPaginatedHookName = `useAll${capitalize(pluralName)}Paginated`;
		hooks[getAllPaginatedHookName] = function useAllPaginated({
			index: unstableIndex,
			skip,
			pageSize = 10,
			key,
			suspend,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			pageSize?: number;
			key?: string;
			suspend?: false;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() =>
					skip
						? null
						: storage[pluralName].findPage({
								index,
								pageSize,
								page: 0,
								key: key || getAllPaginatedHookName,
							}),
				[index, skip, pageSize, storage, key],
			);
			const data = useLiveQueryResult(liveQuery, suspend === false);
			const status = useLiveQueryStatus(liveQuery);

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

					status,
				}),
				[liveQuery, status],
			);

			return [data, tools] as const;
		};
		const getAllInfiniteHookName = `useAll${capitalize(pluralName)}Infinite`;
		hooks[getAllInfiniteHookName] = function useAllInfinite({
			index: unstableIndex,
			skip,
			pageSize = 10,
			key,
			suspend,
		}: {
			index?: CollectionIndexFilter;
			skip?: boolean;
			pageSize?: number;
			key?: string;
			suspend?: false;
		} = {}) {
			const storage = useStorage();
			const index = useStableIndex(unstableIndex);
			// assumptions: this query getter is fast and returns the same
			// query identity for subsequent calls.
			const liveQuery = useMemo(
				() =>
					skip
						? null
						: storage[pluralName].findAllInfinite({
								index,
								pageSize,
								key: key || getAllInfiniteHookName,
							}),
				[index, skip, pageSize, storage, key],
			);
			const data = useLiveQueryResult(liveQuery, suspend === false);
			const status = useLiveQueryStatus(liveQuery);

			const tools = useMemo(
				() => ({
					loadMore: () => liveQuery?.loadMore(),

					get hasMore() {
						return liveQuery?.hasMore;
					},

					status,
				}),
				[liveQuery, status],
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
