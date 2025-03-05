import { EventSubscriber } from '@verdant-web/common';

export class BackoffScheduler extends EventSubscriber<{
	trigger: () => void;
}> {
	private readonly backoff: Backoff;
	private timer: NodeJS.Timeout | null = null;
	private isScheduled = false;

	constructor(backoff: Backoff) {
		super();
		this.backoff = backoff;
	}

	next = () => {
		if (!this.isScheduled) {
			this.isScheduled = true;
			this.timer = setTimeout(() => {
				this.emit('trigger');
				this.isScheduled = false;
				this.backoff.next();
			}, this.backoff.current);
		}
	};

	reset = () => {
		this.backoff.reset();
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	};
}

export class Backoff {
	current = 0;
	private readonly max: number;
	private readonly factor: number;

	constructor(initial: number, max: number, factor: number) {
		this.current = initial;
		this.max = max;
		this.factor = factor;
	}

	next = () => {
		this.current = Math.min(this.max, Math.max(1, this.current) * this.factor);
	};

	reset = () => {
		this.current = 0;
	};
}
