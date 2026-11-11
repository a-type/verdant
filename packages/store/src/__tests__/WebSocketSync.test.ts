import { afterEach, expect, it, vi } from 'vitest';
import type { Context } from '../context/context.js';
import type { PresenceManager } from '../sync/PresenceManager.js';
import { ServerSyncEndpointProvider } from '../sync/ServerSyncEndpointProvider.js';
import { WebSocketSync } from '../sync/WebSocketSync.js';

class TestSocket extends EventTarget {
	static instances: TestSocket[] = [];
	readyState: number = WebSocket.CONNECTING;

	constructor() {
		super();
		TestSocket.instances.push(this);
	}

	send() {}

	close() {
		this.readyState = WebSocket.CLOSED;
	}
}

function createSync(
	getEndpoints: () => Promise<{ websocket: string; token: string }>,
) {
	const ctx = {
		environment: { WebSocket: TestSocket },
		log: vi.fn(),
	} as unknown as Context;
	const endpointProvider = new ServerSyncEndpointProvider(
		{ fetchAuth: vi.fn() },
		ctx,
	);
	vi.spyOn(endpointProvider, 'getEndpoints').mockImplementation(async () => ({
		http: 'http://localhost',
		files: 'http://localhost/files',
		...(await getEndpoints()),
	}));
	const presence = { self: {} } as PresenceManager;
	return new WebSocketSync({ endpointProvider, ctx, presence });
}

afterEach(() => {
	vi.useRealTimers();
	TestSocket.instances = [];
});

it('does not interrupt a scheduled retry or reconnect after stopping', async () => {
	vi.useFakeTimers();
	const sync = createSync(async () => ({
		websocket: 'ws://localhost',
		token: 'token',
	}));
	await sync.start();
	const socket = TestSocket.instances[0];
	socket.readyState = WebSocket.CLOSED;
	await vi.advanceTimersByTimeAsync(4_000);
	socket.dispatchEvent(new Event('error'));

	await vi.advanceTimersByTimeAsync(1_000);
	expect(TestSocket.instances).toHaveLength(1);
	await vi.advanceTimersByTimeAsync(1_000);
	expect(TestSocket.instances).toHaveLength(2);

	await sync.stop();
	window.dispatchEvent(new Event('online'));
	window.dispatchEvent(new Event('pageshow'));
	document.dispatchEvent(new Event('visibilitychange'));
	await vi.advanceTimersByTimeAsync(10_000);
	expect(TestSocket.instances).toHaveLength(2);
	sync.destroy();
});

it('does not create a socket when an endpoint request finishes after stopping', async () => {
	let resolveEndpoint!: (endpoint: {
		websocket: string;
		token: string;
	}) => void;
	const sync = createSync(
		() =>
			new Promise((resolve) => {
				resolveEndpoint = resolve;
			}),
	);
	const started = sync.start();
	await sync.stop();
	resolveEndpoint({ websocket: 'ws://localhost', token: 'token' });
	await started;
	expect(TestSocket.instances).toHaveLength(0);
	expect(sync.status).toBe('paused');
	sync.destroy();
});

it('does not replace a healthy or still-connecting socket', async () => {
	vi.useFakeTimers();
	const sync = createSync(async () => ({
		websocket: 'ws://localhost',
		token: 'token',
	}));
	await sync.start();
	window.dispatchEvent(new Event('online'));
	await vi.advanceTimersByTimeAsync(5_000);
	expect(TestSocket.instances).toHaveLength(1);
	TestSocket.instances[0].readyState = WebSocket.OPEN;
	window.dispatchEvent(new Event('online'));
	await vi.advanceTimersByTimeAsync(5_000);
	expect(TestSocket.instances).toHaveLength(1);
	TestSocket.instances[0].readyState = WebSocket.CLOSED;
	await sync.stop();
	sync.destroy();
});

it('recovers a stranded socket at the five-second watchdog interval', async () => {
	vi.useFakeTimers();
	const sync = createSync(async () => ({
		websocket: 'ws://localhost',
		token: 'token',
	}));
	await sync.start();
	TestSocket.instances[0].readyState = WebSocket.CLOSED;
	await vi.advanceTimersByTimeAsync(4_999);
	expect(TestSocket.instances).toHaveLength(1);
	await vi.advanceTimersByTimeAsync(1);
	expect(TestSocket.instances).toHaveLength(2);
	await sync.stop();
	sync.destroy();
});

it('cancels a pending retry when stopped', async () => {
	vi.useFakeTimers();
	const sync = createSync(async () => ({
		websocket: 'ws://localhost',
		token: 'token',
	}));
	await sync.start();
	TestSocket.instances[0].readyState = WebSocket.CLOSED;
	TestSocket.instances[0].dispatchEvent(new Event('error'));
	await sync.stop();
	await vi.advanceTimersByTimeAsync(10_000);
	expect(TestSocket.instances).toHaveLength(1);
	sync.destroy();
});

it('reconnects immediately on online and cancels the pending retry', async () => {
	vi.useFakeTimers();
	const sync = createSync(async () => ({
		websocket: 'ws://localhost',
		token: 'token',
	}));
	await sync.start();
	TestSocket.instances[0].readyState = WebSocket.CLOSED;
	TestSocket.instances[0].dispatchEvent(new Event('error'));
	window.dispatchEvent(new Event('online'));
	await vi.advanceTimersByTimeAsync(0);
	expect(TestSocket.instances).toHaveLength(2);
	await vi.advanceTimersByTimeAsync(3_000);
	expect(TestSocket.instances).toHaveLength(2);
	await sync.stop();
	sync.destroy();
});

it('retries after an endpoint request fails', async () => {
	vi.useFakeTimers();
	const getEndpoints = vi
		.fn()
		.mockRejectedValueOnce(new Error('offline'))
		.mockResolvedValue({ websocket: 'ws://localhost', token: 'token' });
	const sync = createSync(getEndpoints);
	await sync.start();
	expect(TestSocket.instances).toHaveLength(0);
	await vi.advanceTimersByTimeAsync(2_000);
	expect(TestSocket.instances).toHaveLength(1);
	await sync.stop();
	sync.destroy();
});

it('ignores a stale endpoint request after sync is restarted', async () => {
	const resolveEndpoints: ((endpoint: {
		websocket: string;
		token: string;
	}) => void)[] = [];
	const sync = createSync(
		() => new Promise((resolve) => resolveEndpoints.push(resolve)),
	);
	const firstStart = sync.start();
	await sync.stop();
	const secondStart = sync.start();
	resolveEndpoints[1]({ websocket: 'ws://localhost', token: 'new' });
	await secondStart;
	resolveEndpoints[0]({ websocket: 'ws://localhost', token: 'old' });
	await firstStart;
	expect(TestSocket.instances).toHaveLength(1);
	await sync.stop();
	sync.destroy();
});
