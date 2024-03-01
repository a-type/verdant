import { StorageSchema } from '@verdant-web/common';
import { pascalCase } from 'change-case';

export function getReactTypings({
	schema,
	commonjs,
}: {
	schema: StorageSchema;
	commonjs?: boolean;
}) {
	return `
import { Context, ComponentType, ReactNode } from 'react';
import type {
	Client, ClientDescriptor, Schema, QueryStatus, UserInfo, ObjectEntity, ListEntity, Entity, AccessibleEntityProperty, EntityShape, AnyEntity, EntityDestructured, EntityFile,
  ${Object.values(schema.collections)
		.map((v) => v.name)
		.map((n) => pascalCase(n))
		.flatMap((n) => [n, `${n}Filter`])
		.join(',')}
} from './index${commonjs ? '' : '.js'}';

type HookConfig<F> = {
  index?: F;
  skip?: boolean;
  key?: string;
}

export interface GeneratedHooks<Presence, Profile> {
  /**
	 * Render this context Provider at the top level of your
	 * React tree to provide a Client to all hooks.
	 */
  Provider: ComponentType<{ value: ClientDescriptor<Schema>; children: ReactNode; sync?: boolean }>;
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
	useFindPeer: (query: (peer: UserInfo<Profile, Presence>) => boolean, options?: { includeSelf: boolean }) => UserInfo<Profile, Presence> | null;
	useFindPeers: (query: (peer: UserInfo<Profile, Presence>) => boolean, options?: { includeSelf: boolean }) => UserInfo<Profile, Presence>[];
  useSyncStatus: () => boolean;
	useWatch<T extends AnyEntity<any, any, any> | null>(
    entity: T
  ): EntityDestructured<T>;
  useWatch<
    T extends AnyEntity<any, any, any> | null,
    P extends keyof EntityShape<T>
  >(
    entity: T,
    prop: P
  ): EntityDestructured<T>[P];
	useWatch<T extends EntityFile | null>(
		file: T
	): string | null;
	useUndo(): () => void;
	useRedo(): () => void;
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
  ${Object.entries(schema.collections)
		.map(([plural, { name }]) => {
			const pascalName = pascalCase(name);
			const pascalPlural = pascalCase(plural);
			return `
use${pascalName}(id: string, config?: { skip?: boolean }): ${pascalName} | null;
use${pascalName}Unsuspended(id: string, config?: { skip?: boolean }): { data: ${pascalName} | null; status: QueryStatus };
useOne${pascalName}: <Config extends HookConfig<${pascalName}Filter>>(config?: Config) => ${pascalName} | null;
useOne${pascalPlural}Unsuspended: <Config extends HookConfig<${pascalName}Filter>>(config?: Config) => { data: ${pascalName} | null; status: QueryStatus };
useAll${pascalPlural}: <Config extends HookConfig<${pascalName}Filter>>(config?: Config) => ${pascalName}[];
useAll${pascalPlural}Unsuspended: <Config extends HookConfig<${pascalName}Filter>>(config?: Config) => { data: ${pascalName}[]; status: QueryStatus };
useAll${pascalPlural}Paginated: <Config extends HookConfig<${pascalName}Filter> & { pageSize?: number, suspend?: false }>(config?: Config) => [
	${pascalName}[],
	{ next: () => void; previous: () => void; setPage: (page: number) => void, hasNext: boolean, hasPrevious: boolean, status: QueryStatus }
];
useAll${pascalPlural}Infinite: <Config extends HookConfig<${pascalName}Filter> & { pageSize?: number, suspend?: false }>(config?: Config) => [
	${pascalName}[],
	{ loadMore: () => void; hasMore: boolean, status: QueryStatus }
];
    `;
		})
		.join('\n')}
}

type HookName = \`use\${string}\`;
type ArgsWithoutClient<T> = T extends (client: Client, ...args: infer U) => any
	? U
	: never;
export function createHooks<
	Presence = any,
	Profile = any,
	Mutations extends {
		[N: HookName]: (client: Client<Presence, Profile>, ...args: any[]) => any;
	} = never,
>(
	mutations?: Mutations,
): GeneratedHooks<Presence, Profile> & {
	withMutations: <
		Mutations extends {
			[Name: HookName]: (
				client: Client<Presence, Profile>,
				...args: any[]
			) => unknown;
		},
	>(
		mutations: Mutations,
	) => GeneratedHooks<Presence, Profile> & {
		[MutHook in keyof Mutations]: (
			...args: ArgsWithoutClient<Mutations[MutHook]>
		) => ReturnType<Mutations[MutHook]>;
	};
};`;
}

export function getReactImplementation({
	schemaPath,
	commonjs,
}: {
	schemaPath: string;
	commonjs?: boolean;
}) {
	return `
import { createHooks as baseCreateHooks } from '@verdant-web/react';
import schema from '${schemaPath}${commonjs ? '' : '.js'}';

export function createHooks() {
	return baseCreateHooks(schema);
}
`;
}
