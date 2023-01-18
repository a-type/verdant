import { Context, ComponentType, ReactNode } from 'react';
import type {
	Client,
	ClientDescriptor,
	Schema,
	Item,
	ItemFilter,
} from './index';
import type {
	UserInfo,
	ObjectEntity,
	ListEntity,
	Entity,
	AccessibleEntityProperty,
	EntityShape,
	AnyEntity,
	EntityDestructured,
} from '@lo-fi/web';

type SkippableFilterConfig<F> = {
	index: F;
	skip?: boolean;
};

export interface GeneratedHooks<Presence, Profile> {
	/**
	 * Render this context Provider at the top level of your
	 * React tree to provide a Client to all hooks.
	 */
	Provider: ComponentType<{
		value: ClientDescriptor<Schema>;
		children: ReactNode;
		sync?: boolean;
	}>;
	/**
	 * Direct access to the React Context, if needed.
	 */
	Context: Context<ClientDescriptor<Schema>>;
	/** @deprecated use useClient instead */
	useStorage: () => Client<Presence, Profile>;
	useClient: () => Client<Presence, Profile>;
	useUnsuspendedClient: () => Client<Presence, Profile> | null;
	useSelf: () => UserInfo<Profile, Presence>;
	usePeerIds: () => string[];
	usePeer: (peerId: string | null) => UserInfo<Profile, Presence> | null;
	useFindPeer: (
		query: (peer: UserInfo<Profile, Presence>) => boolean,
		options?: { includeSelf: boolean },
	) => UserInfo<Profile, Presence> | null;
	useFindPeers: (
		query: (peer: UserInfo<Profile, Presence>) => boolean,
		options?: { includeSelf: boolean },
	) => UserInfo<Profile, Presence>[];
	useSyncStatus: () => boolean;
	useWatch<T extends AnyEntity<any, any, any> | null>(
		entity: T,
	): EntityDestructured<T>;
	useWatch<
		T extends AnyEntity<any, any, any> | null,
		P extends keyof EntityShape<T>,
	>(
		entity: T,
		prop: P,
	): EntityDestructured<T>[P];
	useCanUndo(): boolean;
	useCanRedo(): boolean;
	/**
	 * This non-blocking hook declaratively controls sync on/off state.
	 * Render it anywhere in your tree and pass it a boolean to turn sync on/off.
	 * Since it doesn't trigger Suspense, you can do this in, say, a top-level
	 * route component.
	 *
	 * It must still be rendered within your Provider.
	 */
	useSync(isOn: boolean): void;

	useItem(id: string, config?: { skip?: boolean }): Item | null;
	useOneItem: <Config extends SkippableFilterConfig<ItemFilter>>(
		config?: Config,
	) => Item | null;
	useAllItems: <Config extends SkippableFilterConfig<ItemFilter>>(
		config?: Config,
	) => Item[];
}

export function createHooks<Presence = any, Profile = any>(): GeneratedHooks<
	Presence,
	Profile
>;
