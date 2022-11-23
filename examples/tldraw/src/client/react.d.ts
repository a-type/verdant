import { Provider } from "react";
import type {
  Client,
  ClientDescriptor,
  Schema,
  Page,
  PageFilter,
} from "./index.js";
import type {
  UserInfo,
  ObjectEntity,
  ListEntity,
  EntityBase,
  AccessibleEntityProperty,
  DestructuredEntity,
  EntityShape,
} from "@lo-fi/web";

export interface GeneratedHooks<Presence, Profile> {
  Provider: Provider<ClientDescriptor<Schema>>;
  /** @deprecated use useClient instead */
  useStorage: () => Client<Presence, Profile>;
  useClient: () => Client<Presence, Profile>;
  useSelf: () => UserInfo<Profile, Presence>;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo<Profile, Presence>;
  useSyncStatus: () => boolean;
  useWatch<T extends EntityBase<any> | null>(
    entity: T
  ): T extends EntityBase<any> ? DestructuredEntity<EntityShape<T>> : T;
  useWatch<
    T extends EntityBase<any> | null,
    P extends AccessibleEntityProperty<EntityShape<T>>
  >(
    entity: T,
    props: P
  ): EntityShape<T>[P];
  useCanUndo(): boolean;
  useCanRedo(): boolean;

  usePage: (id: string) => Page;
  useOnePage: (config: { index: PageFilter }) => Page;
  useAllPages: (config?: { index: PageFilter }) => Page[];
}

export function createHooks<Presence = any, Profile = any>(): GeneratedHooks<
  Presence,
  Profile
>;
