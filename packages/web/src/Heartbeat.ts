import { ServerMessage } from '@lofi/common';
import { EventSubscriber } from './EventSubscriber.js';
import { Meta } from './Meta.js';
import { Sync } from './Sync.js';

export class Heartbeat extends EventSubscriber<{
	missed: () => void;
}> {
	private sync: Sync;
	private meta: Meta;
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
		meta: Meta;
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
		this.sync.send(await this.meta.createHeartbeat());
		this.deadline = setTimeout(this.onDeadline, this.deadlineLength);
	};

	private onDeadline = () => {
		this.deadline = null;
		this.emit('missed');
	};
}
