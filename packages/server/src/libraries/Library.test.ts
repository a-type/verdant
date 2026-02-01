import {
	ClientMessage,
	Operation,
	ReplicaType,
	ServerMessage,
} from '@verdant-web/common';
import { describe, expect, it, vi } from 'vitest';
import { MessageSender } from '../connections/MessageSender.js';
import { Presence } from '../connections/Presence.js';
import { UserProfileLoader } from '../Profiles.js';
import { sqlShardStorage } from '../storage/index.js';
import { TokenInfo } from '../TokenVerifier.js';
import { Library } from './Library.js';

const profiles = new UserProfileLoader<{ id: string; name: string }>({
	get: async (userId: string) => {
		return {
			id: userId,
			name: 'Alice',
		};
	},
});

const baseOptions = async () => ({
	id: 'library-1',
	profiles,
	storage: await sqlShardStorage({
		databasesDirectory: ':memory:',
		fileDeleteExpirationDays: 7,
		replicaTruancyMinutes: 60 * 24,
	})('library-1'),
	clientConnections: {
		presence: new Presence({
			get: async (userId: string) => {
				return {
					id: userId,
					name: 'Alice',
				};
			},
		}),
	} as any,
});

let time = 0;
const now = () => `faketime-${time++}`;

type TestReplica = {
	key: string;
	replicaId: string;
	messages: ServerMessage[];
	tokenInfo: TokenInfo;
};
function createTestReplica(id: string): TestReplica {
	return {
		key: `clientKey-${id}`,
		replicaId: `replica-${id}`,
		messages: [],
		tokenInfo: {
			libraryId: 'library-1',
			syncEndpoint: 'http://localhost:3000/sync',
			token: 'fake',
			type: ReplicaType.Realtime,
			userId: `user-${id}`,
		},
	};
}

// collects all received operations for a replica
function getAllReceivedReplicaOperations(replica: TestReplica) {
	const operations: Operation[] = [];
	for (const message of replica.messages) {
		switch (message.type) {
			case 'op-re':
			case 'sync-resp':
				operations.push(...message.operations);
				break;
		}
	}
	return operations;
}

describe('Library', () => {
	describe('sync handling', () => {
		it('should initialize a new library from a replica', async () => {
			const sender: MessageSender = {
				broadcast: vi.fn(),
				respond: vi.fn((_: string, message: ServerMessage) => {}),
			};

			const tokenInfo: TokenInfo = {
				libraryId: 'library-1',
				syncEndpoint: 'http://localhost:3000/sync',
				token: 'fake',
				type: ReplicaType.Realtime,
				userId: 'user-1',
			};

			const library = new Library({
				...(await baseOptions()),
				sender,
			});

			const messages: ClientMessage[] = [
				{
					type: 'sync',
					baselines: [
						{
							oid: 'notes/1',
							timestamp: now(),
							snapshot: {
								title: 'My Note',
								content: 'This is my note.',
							},
						},
					],
					operations: [
						{
							oid: 'notes/1',
							timestamp: now(),
							data: {
								op: 'set',
								name: 'title',
								value: 'My Note!',
							},
						},
						{
							oid: 'notes/2',
							timestamp: now(),
							data: {
								op: 'initialize',
								value: {
									title: 'Another Note',
									content: 'This is another note.',
								},
							},
						},
					],
					replicaId: 'replica-1',
					schemaVersion: 1,
					since: null,
					timestamp: now(),
				},
			];

			// purposefully do not await in order - these all come at the same time
			await Promise.all(
				messages.map((m) => library.handleMessage(m, 'clientKey-1', tokenInfo)),
			);

			// expect sender.broadcast for the operations, and a reply with sync response
			expect(sender.broadcast).toHaveBeenCalledWith(
				{
					type: 'op-re',
					baselines: [
						{
							oid: 'notes/1',
							timestamp: `faketime-0`,
							snapshot: {
								title: 'My Note',
								content: 'This is my note.',
							},
						},
					],
					operations: [
						{
							oid: 'notes/1',
							timestamp: `faketime-1`,
							data: {
								op: 'set',
								name: 'title',
								value: 'My Note!',
							},
						},
						{
							oid: 'notes/2',
							timestamp: `faketime-2`,
							data: {
								op: 'initialize',
								value: {
									title: 'Another Note',
									content: 'This is another note.',
								},
							},
						},
					],
					replicaId: 'replica-1',
					globalAckTimestamp: undefined,
				},
				['clientKey-1'],
			);

			expect(sender.respond).toHaveBeenCalledWith('clientKey-1', {
				type: 'sync-resp',
				operations: [],
				baselines: [],
				ackThisNonce: undefined,
				ackedTimestamp: 'faketime-3',
				globalAckTimestamp: undefined,
				overwriteLocalData: false,
				peerPresence: {},
			});
		});

		it('should sync up to latest data, while also rebroadcasting concurrent new operations', async () => {
			// this test setup is more involved - a fake sender will distribute messages to our
			// fake replicas, and we will verify that the replicas end up with the right data.
			const replicaA = createTestReplica('a');
			const replicaB = createTestReplica('b');
			const replicas = [replicaA, replicaB];

			const sender: MessageSender = {
				broadcast: (message: ServerMessage, omitKeys?: string[]) => {
					replicas.forEach((replica) => {
						if (!omitKeys?.includes(replica.key)) {
							replica.messages.push(message);
						}
					});
				},
				respond: (clientKey: string, message: ServerMessage) => {
					const replica = replicas.find((r) => r.key === clientKey);
					if (replica) {
						replica.messages.push(message);
					}
				},
			};

			const library = new Library({
				...(await baseOptions()),
				sender,
			});

			// replica A sends a sync message to initialize library
			const syncMessageA: ClientMessage = {
				type: 'sync',
				baselines: [
					{
						oid: 'notes/1',
						timestamp: now(),
						snapshot: {
							title: 'My Note',
							content: 'This is my note.',
						},
					},
				],
				operations: [
					{
						oid: 'notes/1',
						timestamp: now(),
						data: {
							op: 'set',
							name: 'title',
							value: 'My Note!',
						},
					},
				],
				replicaId: 'replica-a',
				schemaVersion: 1,
				since: null,
				timestamp: now(),
			};
			await library.handleMessage(
				syncMessageA,
				replicaA.key,
				replicaA.tokenInfo,
			);

			// concurrently, replica B syncs, and A sends more operations
			const syncMessageB: ClientMessage = {
				type: 'sync',
				baselines: [],
				operations: [],
				replicaId: 'replica-b',
				schemaVersion: 1,
				since: null,
				timestamp: now(),
				resyncAll: true,
			};
			const opMessageA: ClientMessage = {
				type: 'op',
				replicaId: 'replica-a',
				operations: [
					{
						oid: 'notes/1',
						timestamp: now(),
						data: {
							op: 'set',
							name: 'content',
							value: 'This is my note!',
						},
					},
				],
				timestamp: now(),
			};
			await Promise.all([
				library.handleMessage(syncMessageB, replicaB.key, replicaB.tokenInfo),
				library.handleMessage(opMessageA, replicaA.key, replicaA.tokenInfo),
			]);

			// there are two valid scenario outcomes here:
			// 1. A's operation is resolved before B's sync reads operations, and so it's
			//    included in B's sync response
			// 2. B's sync reads operations before A's operation is resolved, and so it's
			//    not included in the sync, but is rebroadcast to B later
			//
			// Either way we should end up with that operation on B.
			const operationsSentToB = getAllReceivedReplicaOperations(replicaB);
			expect(operationsSentToB).toContainEqual({
				oid: 'notes/1',
				timestamp: 'faketime-5',
				data: {
					op: 'set',
					name: 'title',
					value: 'My Note!',
				},
			});
			expect(operationsSentToB).toContainEqual({
				oid: 'notes/1',
				timestamp: 'faketime-8',
				data: {
					op: 'set',
					name: 'content',
					value: 'This is my note!',
				},
			});
		});

		it('should reject syncs with data from read replicas', async () => {
			const sender = {
				broadcast: vi.fn(),
				respond: vi.fn(),
			};

			const tokenInfo: TokenInfo = {
				libraryId: 'library-1',
				syncEndpoint: 'http://localhost:3000/sync',
				token: 'fake',
				type: ReplicaType.ReadOnlyPull,
				userId: 'user-1',
			};

			const library = new Library({
				...(await baseOptions()),
				sender,
			});

			const messages: ClientMessage[] = [
				{
					type: 'sync',
					baselines: [
						{
							oid: 'notes/1',
							timestamp: now(),
							snapshot: {
								title: 'My Note',
								content: 'This is my note.',
							},
						},
					],
					operations: [
						{
							oid: 'notes/1',
							timestamp: now(),
							data: {
								op: 'set',
								name: 'title',
								value: 'My Note!',
							},
						},
						{
							oid: 'notes/2',
							timestamp: now(),
							data: {
								op: 'initialize',
								value: {
									title: 'Another Note',
									content: 'This is another note.',
								},
							},
						},
					],
					replicaId: 'replica-1',
					schemaVersion: 1,
					since: null,
					timestamp: now(),
				},
			];

			// purposefully do not await in order - these all come at the same time
			await Promise.all(
				messages.map((m) => library.handleMessage(m, 'clientKey-1', tokenInfo)),
			);

			expect(sender.respond).toHaveBeenCalledOnce();
			expect(sender.respond).toHaveBeenCalledWith('clientKey-1', {
				type: 'forbidden',
			});
		});

		it('should reject messages from a replica claimed by a user other than the one recorded on the server', async () => {
			const sender = {
				broadcast: vi.fn(),
				respond: vi.fn((_: string, message: ServerMessage) => {}),
			};

			const tokenInfo: TokenInfo = {
				libraryId: 'library-1',
				syncEndpoint: 'http://localhost:3000/sync',
				token: 'fake',
				type: ReplicaType.Realtime,
				userId: 'user-1',
			};

			const library = new Library({
				...(await baseOptions()),
				sender,
			});

			// purposefully do not await in order - these all come at the same time
			await library.handleMessage(
				{
					type: 'sync',
					baselines: [],
					operations: [],
					replicaId: 'replica-1',
					schemaVersion: 1,
					since: null,
					timestamp: now(),
				},
				'clientKey-1',
				tokenInfo,
			);
			sender.respond.mockReset();

			// now try to send a message from a different user with the same replica
			const tokenInfo2: TokenInfo = {
				libraryId: 'library-1',
				syncEndpoint: 'http://localhost:3000/sync',
				token: 'fake',
				type: ReplicaType.Realtime,
				userId: 'user-2',
			};

			const message: ClientMessage = {
				type: 'sync',
				baselines: [],
				operations: [],
				replicaId: 'replica-1',
				schemaVersion: 1,
				since: null,
				timestamp: now(),
			};

			await library.handleMessage(message, 'clientKey-1', tokenInfo2);

			expect(sender.respond).toHaveBeenCalledOnce();
			expect(sender.respond).toHaveBeenCalledWith('clientKey-1', {
				type: 'forbidden',
			});
		});
	});

	it('should fully destroy itself', async () => {
		const sender = {
			broadcast: vi.fn(),
			respond: vi.fn(),
		};

		const library = new Library({
			...(await baseOptions()),
			sender,
		});

		const opMessage: ClientMessage = {
			type: 'op',
			replicaId: 'replica-1',
			operations: [
				{
					oid: 'notes/1',
					timestamp: now(),
					data: {
						op: 'set',
						name: 'title',
						value: 'My Note!',
					},
				},
			],
			timestamp: now(),
		};
		await library.handleMessage(opMessage, 'clientKey-1', {
			libraryId: 'library-1',
			syncEndpoint: 'http://localhost:3000/sync',
			token: 'fake',
			type: ReplicaType.Realtime,
			userId: 'user-1',
		});

		let info = await library.getInfo();
		expect(info?.operationsCount).toBe(1);

		await library.destroy();

		info = await library.getInfo();
		expect(info).toBe(null);
	});
});
