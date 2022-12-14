import { Context, ComponentType, ReactNode } from "react";
import type {
  Client,
  ClientDescriptor,
  Schema,
  Item,
  ItemFilter,
  Category,
  CategoryFilter,
} from "./index.js";
import type {
  UserInfo,
  ObjectEntity,
  ListEntity,
  Entity,
  AccessibleEntityProperty,
  EntityShape,
} from "@lo-fi/web";

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
  useSelf: () => UserInfo<Profile, Presence>;
  usePeerIds: () => string[];
  usePeer: (peerId: string | null) => UserInfo<Profile, Presence> | null;
  useSyncStatus: () => boolean;
  useWatch<T extends Entity<any, any> | null>(
    entity: T
  ): T extends Entity<any, any> ? EntityShape<T> : T;
  useWatch<
    T extends Entity<any, any> | null,
    P extends AccessibleEntityProperty<EntityShape<T>>
  >(
    entity: T,
    props: P
  ): EntityShape<T>[P];
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

  useItem: (id: string) => Item;
  useOneItem: (config: { index: ItemFilter }) => Item;
  useAllItems: (config?: { index: ItemFilter }) => Item[];

  useCategory: (id: string) => Category;
  useOneCategory: (config: { index: CategoryFilter }) => Category;
  useAllCategories: (config?: { index: CategoryFilter }) => Category[];
}

export function createHooks<Presence = any, Profile = any>(): GeneratedHooks<
  Presence,
  Profile
>;
