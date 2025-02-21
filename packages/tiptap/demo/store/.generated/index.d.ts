import { ClientDescriptorOptions } from "./client.js";
export * from "./client.js";
import { ClientDescriptor as StorageDescriptor } from "./client.js";
export * from "@verdant-web/store";
export declare class ClientDescriptor<Presence = unknown, Profile = unknown> extends StorageDescriptor<Presence, Profile> {
    constructor(init: ClientDescriptorOptions<Presence, Profile>);
}
