import { Context, ComponentType, ReactNode } from 'react';
import type {
	Client,
	ClientDescriptor,
	Schema,
	Page,
	PageFilter,
	Asset,
	AssetFilter,
} from './index.js';
import type {
	UserInfo,
	ObjectEntity,
	ListEntity,
	Entity,
	AccessibleEntityProperty,
	EntityShape,
	AnyEntity,
	EntityDestructured,
} from '@verdant-web/store';

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

	usePage(id: string, config?: { skip?: boolean }): Page | null;
	useOnePage: <Config extends SkippableFilterConfig<PageFilter>>(
		config?: Config,
	) => Page | null;
	useAllPages: <Config extends SkippableFilterConfig<PageFilter>>(
		config?: Config,
	) => Page[];

	useAsset(id: string, config?: { skip?: boolean }): Asset | null;
	useOneAsset: <Config extends SkippableFilterConfig<AssetFilter>>(
		config?: Config,
	) => Asset | null;
	useAllAssets: <Config extends SkippableFilterConfig<AssetFilter>>(
		config?: Config,
	) => Asset[];
}

export function createHooks<Presence = any, Profile = any>(): GeneratedHooks<
	Presence,
	Profile
>;
