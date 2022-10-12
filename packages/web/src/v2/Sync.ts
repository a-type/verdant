import {
	ClientMessage,
	HybridLogicalClockTimestampProvider,
	ServerMessage,
	TimestampProvider,
	EventSubscriber,
} from '@lo-fi/common';

export interface Sync {
	subscribe(
		event: 'message',
		handler: (message: ServerMessage) => void,
	): () => void;
	subscribe(
		event: 'onlineChange',
		handler: (online: boolean) => void,
	): () => void;

	send(message: ClientMessage): void;

	start(): void;
	stop(): void;

	dispose(): void;

	reconnect(): void;

	readonly active: boolean;

	readonly time: TimestampProvider;
}

export class WebsocketSync
	extends EventSubscriber<{
		message: (message: ServerMessage) => void;
		onlineChange: (online: boolean) => void;
	}>
	implements Sync
{
	readonly time: TimestampProvider;
	private socket: WebSocket | null = null;
	private messageQueue: ClientMessage[] = [];
	private reconnectBackoffTime = 100;
	private host: string;
	private reconnectAttempt: NodeJS.Timer | null = null;

	constructor({
		host,
		time: timestampProvider,
	}: {
		host: string;
		time?: TimestampProvider;
	}) {
		super();
		this.host = host;
		this.time = timestampProvider || new HybridLogicalClockTimestampProvider();
	}

	private onOpen = () => {
		if (!this.socket) {
			throw new Error('Invalid sync state: online but socket is null');
		}
		if (this.messageQueue.length) {
			for (const msg of this.messageQueue) {
				this.socket.send(JSON.stringify(msg));
			}
			this.messageQueue = [];
		}
		this.reconnectBackoffTime = 100;
		console.info('Sync connected');
		if (this.reconnectAttempt) {
			clearTimeout(this.reconnectAttempt);
		}
		this.emit('onlineChange', true);
	};

	private onMessage = (event: MessageEvent) => {
		const message = JSON.parse(event.data) as ServerMessage;
		if ((message as any).timestamp) {
			this.time.update((message as any).timestamp);
		}
		this.emit('message', message);
	};

	private onError = (event: Event) => {
		console.error(event);
		console.info(
			`Attempting reconnect in ${Math.round(
				this.reconnectBackoffTime / 1000,
			)} seconds`,
		);
		if (this.reconnectAttempt) {
			clearTimeout(this.reconnectAttempt);
		}
		this.reconnectAttempt = setTimeout(() => {
			console.info('Reconnecting...');
			this.reconnectBackoffTime *= 2;
			this.initializeSocket();
		}, this.reconnectBackoffTime);
	};

	private onClose = (event: CloseEvent) => {
		console.info('Sync disconnected');
		this.emit('onlineChange', false);
		this.onError(event);
	};

	private initializeSocket = () => {
		this.socket = new WebSocket(this.host);
		this.socket.addEventListener('message', this.onMessage);
		this.socket.addEventListener('open', this.onOpen);
		this.socket.addEventListener('error', this.onError);
		this.socket.addEventListener('close', this.onClose);
		return this.socket;
	};

	reconnect = () => {
		this.stop();
		this.start();
	};

	send = (message: ClientMessage) => {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		} else {
			this.messageQueue.push(message);
		}
	};

	dispose = () => {
		this.socket?.removeEventListener('close', this.onClose);
		this.socket?.close();
	};

	start = () => {
		if (this.socket) {
			return;
		}
		this.initializeSocket();
	};

	stop = () => {
		this.dispose();
		this.socket = null;
	};

	get active() {
		return this.socket?.readyState === WebSocket.OPEN;
	}
}

export interface HybridSyncOptions {
	host: string;
	timestampProvider?: TimestampProvider;
}
