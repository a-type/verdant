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

export interface GeneratedHooks {
  Provider: Provider<ClientDescriptor<Schema>>;
  useStorage: () => Client;
  useSelf: () => UserInfo;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo;
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

  usePage: (id: string) => Page;
  useOnePage: (config: { index: PageFilter }) => Page;
  useAllPages: (config?: { index: PageFilter }) => Page[];
}

export const hooks: GeneratedHooks;
