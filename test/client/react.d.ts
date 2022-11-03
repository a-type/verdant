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
import type { UserInfo, ObjectEntity, ListEntity } from "@lo-fi/web";

export interface GeneratedHooks {
  Provider: Provider<ClientDescriptor<Schema>>;
  useStorage: () => Client;
  useSelf: () => UserInfo;
  usePeerIds: () => string[];
  usePeer: (peerId: string) => UserInfo;
  useSyncStatus: () => boolean;
  useWatch: (entity: ObjectEntity<any> | ListEntity<any>) => void;

  useItem: (id: string) => Item;
  useOneItem: (config: { index: ItemFilter }) => Item;
  useAllItems: (config?: { index: ItemFilter }) => Item[];

  useCategory: (id: string) => Category;
  useOneCategory: (config: { index: CategoryFilter }) => Category;
  useAllCategories: (config?: { index: CategoryFilter }) => Category[];
}

export const hooks: GeneratedHooks;
