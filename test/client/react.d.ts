import { Provider } from "react";
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
  EntityBase,
  AccessibleEntityProperty,
  EntityShape,
} from "@lo-fi/web";

export interface GeneratedHooks<Presence, Profile> {
  Provider: Provider<ClientDescriptor<Schema>>;
  /** @deprecated use useClient instead */
  useStorage: () => Client<Presence, Profile>;
  useClient: () => Client<Presence, Profile>;
  useSelf: () => UserInfo<Profile, Presence>;
  usePeerIds: () => string[];
  usePeer: (peerId: string | null) => UserInfo<Profile, Presence> | null;
  useSyncStatus: () => boolean;
  useWatch<T extends EntityBase<any> | null>(
    entity: T
  ): T extends EntityBase<any> ? EntityShape<T> : T;
  useWatch<
    T extends EntityBase<any> | null,
    P extends AccessibleEntityProperty<EntityShape<T>>
  >(
    entity: T,
    props: P
  ): EntityShape<T>[P];
  useCanUndo(): boolean;
  useCanRedo(): boolean;

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
