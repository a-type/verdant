import {
	ClientMessage,
	ObjectIdentifier,
	ServerMessage,
	EventSubscriber,
	getOidRoot,
} from '@lo-fi/common';
import type { Sync } from './Sync.js';
import { EntityStore } from './EntityStore.js';
import { Metadata } from './Metadata.js';

/**
  Bridges sync messages and the local storage, interpreting messages and
  handling initial sync and heartbeat.
 */
export class SyncHarness {
	private sync;
	private meta;
	private initialPresence: any;
	private heartbeat;
	private entities;

	constructor({
		sync,
		meta,
		initialPresence,
		entities,
	}: {
		sync: Sync;
		meta: Metadata;
		entities: EntityStore;
		initialPresence: any;
	}) {
		this.sync = sync;
		this.meta = meta;
		this.initialPresence = initialPresence;
		this.entities = entities;
		this.heartbeat = new Heartbeat({
			sync: this.sync,
			meta: this.meta,
		});
		sync.subscribe('onlineChange', this.handleOnlineChange);
		sync.subscribe('message', this.handleMessage);
	}

	private handleOnlineChange = async (online: boolean) => {
		if (!online) {
			this.heartbeat.stop();
		} else {
			const lastSyncTimestamp = await this.meta.lastSyncedTimestamp();
			this.sync.send(
				await this.meta.messageCreator.createSyncStep1(!lastSyncTimestamp),
			);
			this.sync.send(
				await this.meta.messageCreator.createPresenceUpdate(
					this.initialPresence,
				),
			);
			this.heartbeat.start();
		}
	};

	private handleMessage = async (message: ServerMessage) => {
		let affectedOids: ObjectIdentifier[] | undefined = undefined;
		switch (message.type) {
			case 'op-re':
				// rebroadcasted operations
				affectedOids = await this.meta.insertRemoteOperations(
					message.operations,
				);
				break;
			case 'sync-resp':
				if (message.overwriteLocalData) {
					await this.meta.reset();
					await this.entities.reset();
				}

				affectedOids = await this.meta.insertRemoteOperations(
					message.operations,
				);

				await this.meta.ackInfo.setGlobalAck(message.globalAckTimestamp);

				// respond to the server
				this.sync.send(
					await this.meta.messageCreator.createSyncStep2(
						message.provideChangesSince,
					),
				);
				await this.meta.updateLastSynced();
				break;
			case 'rebases':
				const affectedSet = new Set<ObjectIdentifier>();
				for (const rebase of message.rebases) {
					await this.meta.rebase(rebase.oid, rebase.upTo);
					affectedSet.add(getOidRoot(rebase.oid));
				}
				affectedOids = Array.from(affectedSet);
				break;
		}

		if (affectedOids?.length) {
			this.entities.refreshAll(affectedOids);
		}
	};

	send = async (message: ClientMessage) => {
		this.sync.send(message);
	};
}

export class Heartbeat extends EventSubscriber<{
	missed: () => void;
}> {
	private sync: Sync;
	private meta: Metadata;
	private interval: number;
	private deadlineLength: number;
	private nextBeat: NodeJS.Timeout | null = null;
	private deadline: NodeJS.Timeout | null = null;

	constructor({
		sync,
		meta,
		interval = 15 * 1000,
		deadlineLength = 3 * 1000,
	}: {
		sync: Sync;
		meta: Metadata;
		interval?: number;
		deadlineLength?: number;
	}) {
		super();
		this.sync = sync;
		this.meta = meta;
		this.interval = interval;
		this.deadlineLength = deadlineLength;
		sync.subscribe('message', this.handleSyncMessage);
	}

	private handleSyncMessage = (message: ServerMessage) => {
		if (message.type === 'heartbeat-response') {
			if (this.deadline) {
				clearTimeout(this.deadline);
				this.deadline = null;
				this.start();
			}
		}
	};

	start = () => {
		this.nextBeat = setTimeout(this.beat, this.interval);
	};

	stop = () => {
		if (this.nextBeat) {
			clearTimeout(this.nextBeat);
		}
		if (this.deadline) {
			clearTimeout(this.deadline);
		}
	};

	private beat = async () => {
		this.sync.send(await this.meta.messageCreator.createHeartbeat());
		this.deadline = setTimeout(this.onDeadline, this.deadlineLength);
	};

	private onDeadline = () => {
		this.deadline = null;
		this.emit('missed');
	};
}
