// spin up a server, then connect two clients
// with raw websockets. send messages from client
// A and await them on client B.
// Then do one final sync with a third client.

// starts default server
import serverPromise from '../bin/server.mjs';
import { WebSocket } from 'ws';

const server = await serverPromise;

class TestClient {
	constructor(userId, onMessage) {
		this.userId = userId;
		this.onMessage = onMessage;
	}

	async connect(libraryId) {
		const res = await fetch(
			`http://localhost:3242/auth/perf-test?userId=${this.userId}`,
		);
		const { accessToken } = await res.json();
		this.accessToken = accessToken;
		this.ws = new WebSocket(
			`ws://localhost:3242/sync?accessToken=${accessToken}`,
			['Bearer', accessToken],
		);
		this.ws.onmessage = (event) => {
			this.onMessage(JSON.parse(event.data));
		};
		this.ws.onerror = (event) => {
			console.error('ws error', event);
		};
		this.ws.onclose = (event) => {
			console.error('ws close', event);
		};
		return new Promise((resolve) => {
			this.ws.onopen = resolve;
		});
	}

	send(message) {
		this.ws.send(JSON.stringify(message));
	}
}

let lastTimestamp = 0;
function now() {
	return `time-${lastTimestamp++}`;
}

const clientASent = new Set();
const clientA = new TestClient('clientA', () => {});
const clientB = new TestClient('clientB', (message) => {
	if (message.type === 'op-re') {
		for (const op of message.operations) {
			clientASent.delete(op.oid);
		}
	}
});

await clientA.connect();
await clientB.connect();

const start = Date.now();

clientA.send({
	type: 'sync',
	replicaId: 'replica-a1',
	timestamp: now(),
	operations: [],
	baselines: [],
	schemaVersion: 1,
	since: null,
});

clientB.send({
	type: 'sync',
	replicaId: 'replica-b1',
	timestamp: now(),
	operations: [],
	baselines: [],
	schemaVersion: 1,
	resyncAll: true,
	since: null,
});

for (let i = 0; i < 1000; i++) {
	clientASent.add(i);
	clientA.send({
		type: 'op',
		replicaId: 'replica-a1',
		timestamp: now(),
		operations: [
			{
				oid: i,
				timestamp: now(),
				data: { type: 'initialize', value: { foo: 'bar' } },
			},
		],
	});
}

let pollUntil = Date.now() + 1000 * 60 * 5;
while (clientASent.size > 0 && Date.now() < pollUntil) {
	await new Promise((resolve) => setTimeout(resolve, 100));
}

console.log('Client B received all messages from client A');
console.log('Time:', (Date.now() - start) / 1000, 's');

await new Promise(async (resolve) => {
	const clientC = new TestClient('clientC', (message) => {
		if (message.type === 'sync-resp') {
			resolve();
		}
	});
	await clientC.connect();
	clientC.send({
		type: 'sync',
		replicaId: 'replica-c1',
		timestamp: now(),
		operations: [],
		baselines: [],
		schemaVersion: 1,
		since: null,
		resyncAll: true,
	});
});

console.log('Client C received all messages from server');
console.log('Total time:', (Date.now() - start) / 1000, 's');

console.log('Done!');
server.httpServer.close();

process.exit(0);
