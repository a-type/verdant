import { EventSubscriber } from '@lo-fi/common';

export class Heartbeat extends EventSubscriber<{
	missed: () => void;
	beat: () => void;
}> {
	private _interval: number;
	private deadlineLength: number;
	private nextBeat: NodeJS.Timeout | null = null;
	private deadline: NodeJS.Timeout | null = null;

	get interval() {
		return this._interval;
	}

	constructor({
		interval = 15 * 1000,
		deadlineLength = 3 * 1000,
	}: {
		interval?: number;
		deadlineLength?: number;
	} = {}) {
		super();
		this._interval = interval;
		this.deadlineLength = deadlineLength;
	}

	keepAlive = () => {
		if (this.deadline) {
			clearTimeout(this.deadline);
			this.deadline = null;
			this.start();
		}
	};

	start = (immediate = false) => {
		this.stop();
		if (immediate) {
			this.beat();
		} else {
			this.nextBeat = setTimeout(this.beat, this._interval);
		}
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
		this.emit('beat');
		this.deadline = setTimeout(this.onDeadline, this.deadlineLength);
	};

	private onDeadline = () => {
		this.deadline = null;
		this.emit('missed');
	};

	/**
	 * Only takes affect after the next beat
	 */
	setInterval = (interval: number) => {
		this._interval = interval;
	};
}
