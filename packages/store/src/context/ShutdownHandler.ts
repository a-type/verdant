export class ShutdownHandler {
	private consumed = false;
	private readonly handlers: (() => Promise<void>)[] = [];
	constructor(
		private log?: (
			level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
			...args: any[]
		) => void,
	) {}

	register(handler: () => Promise<void>) {
		this.handlers.push(handler);
	}

	async shutdown() {
		if (this.consumed) {
			this.log?.('warn', 'ShutdownHandler already consumed');
		}

		this.consumed = true;
		await Promise.all(this.handlers.map((handler) => handler()));
		this.handlers.length = 0;
	}

	get isShuttingDown() {
		return this.consumed;
	}

	reset = () => {
		this.consumed = false;
	};
}
