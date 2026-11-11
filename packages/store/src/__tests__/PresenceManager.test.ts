import { ServerMessage, UserInfo } from '@verdant-web/common';
import { expect, it, vi } from 'vitest';
import type { Context } from '../context/context.js';
import type { LocalReplicaInfo } from '../persistence/interfaces.js';
import { HANDLE_MESSAGE, PresenceManager } from '../sync/PresenceManager.js';
import { ServerSync } from '../sync/Sync.js';

const replica = { id: 'replica-a' } as LocalReplicaInfo;
const user = (id: string): UserInfo<{}, {}> => ({
	id,
	replicaId: `replica-${id.toLowerCase()}`,
	profile: {},
	presence: {},
	internal: {},
});
const version = (revision: number, epoch = 'first') => ({ epoch, revision });
const change = (
	id: string,
	revision: number,
	epoch = 'first',
): ServerMessage => ({
	type: 'presence-changed',
	replicaId: `replica-${id.toLowerCase()}`,
	userInfo: user(id),
	presenceVersion: version(revision, epoch),
});
const offline = (id: string, revision: number): ServerMessage => ({
	type: 'presence-offline',
	userId: id,
	presenceVersion: version(revision),
});
const snapshot = (
	ids: string[],
	revision: number,
	epoch = 'first',
): ServerMessage => ({
	type: 'sync-resp',
	operations: [],
	baselines: [],
	overwriteLocalData: false,
	globalAckTimestamp: undefined,
	ackedTimestamp: '0',
	peerPresence: Object.fromEntries(ids.map((id) => [id, user(id)])),
	presenceVersion: version(revision, epoch),
});

function createManager() {
	const ctx = {
		waitForInitialization: new Promise(() => {}),
	} as unknown as Context;
	return new PresenceManager({ initialPresence: {}, defaultProfile: {}, ctx });
}

it('retains newer joins and departures when an older snapshot arrives', async () => {
	const presence = createManager();
	const peerLeft = vi.fn();
	presence.subscribe('peerLeft', peerLeft);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	await presence[HANDLE_MESSAGE](replica, change('C', 3));
	await presence[HANDLE_MESSAGE](replica, offline('B', 4));
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 2));
	expect(presence.peerIds).toEqual(['C']);
	expect(peerLeft).toHaveBeenCalledOnce();
	expect(peerLeft).toHaveBeenCalledWith('B', user('B'));
});

it('ignores stale snapshots and per-user updates without dropping other users', async () => {
	const presence = createManager();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 2));
	await presence[HANDLE_MESSAGE](replica, offline('C', 5));
	await presence[HANDLE_MESSAGE](replica, change('C', 4));
	await presence[HANDLE_MESSAGE](replica, change('D', 3));
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	expect(presence.peerIds).toEqual(['B', 'D']);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'D'], 6));
	await presence[HANDLE_MESSAGE](replica, change('B', 2));
	expect(presence.peerIds).toEqual(['D']);
});

it('reconciles polling acknowledgement snapshots with newer updates', async () => {
	const presence = createManager();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	await presence[HANDLE_MESSAGE](replica, change('C', 3));
	await presence[HANDLE_MESSAGE](replica, {
		type: 'server-ack',
		timestamp: '1',
		peerPresence: { A: user('A'), B: user('B') },
		presenceVersion: version(2),
	});
	expect(presence.peerIds).toEqual(['B', 'C']);
});

it('retains a newer self replica update when applying an older snapshot', async () => {
	const presence = createManager();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A'], 1));
	const selfUpdate = change('A', 3);
	if (selfUpdate.type !== 'presence-changed') throw new Error('Invalid test');
	selfUpdate.userInfo.replicaIds = ['replica-a', 'replica-other'];
	await presence[HANDLE_MESSAGE](replica, selfUpdate);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A'], 2));
	expect([...presence.selfReplicaIds].sort()).toEqual([
		'replica-a',
		'replica-other',
	]);
});

it('retains the current peer state and emits it when applying an older snapshot', async () => {
	const presence = createManager();
	const peerChanged = vi.fn();
	presence.subscribe('peerChanged', peerChanged);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	const update = change('B', 3);
	if (update.type !== 'presence-changed') throw new Error('Invalid test');
	update.userInfo.profile = { name: 'new' };
	await presence[HANDLE_MESSAGE](replica, update);
	peerChanged.mockClear();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 2));
	expect(presence.peers.B.profile).toEqual({ name: 'new' });
	expect(peerChanged).toHaveBeenCalledWith('B', update.userInfo);
});

it('does not restore self from an older snapshot after a newer departure', async () => {
	const presence = createManager();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A'], 1));
	const selfChanged = vi.fn();
	presence.subscribe('selfChanged', selfChanged);
	await presence[HANDLE_MESSAGE](replica, offline('A', 3));
	await presence[HANDLE_MESSAGE](replica, snapshot(['A'], 2));
	expect(selfChanged).not.toHaveBeenCalled();
});

it('requests a fresh snapshot after a server epoch change', async () => {
	const presence = createManager();
	const reset = vi.fn();
	presence.subscribe('versionReset', reset);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 10));
	await presence[HANDLE_MESSAGE](replica, change('C', 1, 'second'));
	expect(reset).toHaveBeenCalledOnce();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'C'], 1, 'second'));
	expect(presence.peerIds).toEqual(['C']);
});

it('requests another snapshot if a delayed response belongs to an old epoch', async () => {
	const presence = createManager();
	const reset = vi.fn();
	presence.subscribe('versionReset', reset);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 10));
	await presence[HANDLE_MESSAGE](replica, change('C', 1, 'second'));
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 11));
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'C'], 2, 'second'));
	expect(reset).toHaveBeenCalledTimes(3);
	expect(presence.peerIds).toEqual(['C']);
});

it('continues to accept presence messages from older servers', async () => {
	const presence = createManager();
	const legacyChange = change('C', 1);
	if (legacyChange.type !== 'presence-changed') throw new Error('Invalid test');
	delete legacyChange.presenceVersion;
	await presence[HANDLE_MESSAGE](replica, legacyChange);
	const legacySnapshot = snapshot(['A', 'B'], 1);
	if (legacySnapshot.type !== 'sync-resp') throw new Error('Invalid test');
	delete legacySnapshot.presenceVersion;
	await presence[HANDLE_MESSAGE](replica, legacySnapshot);
	expect(presence.peerIds).toEqual(['B']);
});

it('discards version metadata when an unversioned snapshot replaces presence', async () => {
	const presence = createManager();
	const reset = vi.fn();
	presence.subscribe('versionReset', reset);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	await presence[HANDLE_MESSAGE](replica, change('C', 3));
	const legacySnapshot = snapshot(['A', 'B'], 1);
	if (legacySnapshot.type !== 'sync-resp') throw new Error('Invalid test');
	delete legacySnapshot.presenceVersion;
	await presence[HANDLE_MESSAGE](replica, legacySnapshot);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 2));
	expect(presence.peerIds).toEqual(['B']);
	await presence[HANDLE_MESSAGE](replica, change('C', 1, 'second'));
	expect(reset).toHaveBeenCalledOnce();
});

it('discards version metadata when an unversioned update replaces presence', async () => {
	const presence = createManager();
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 1));
	await presence[HANDLE_MESSAGE](replica, change('C', 3));
	const legacyChange = change('C', 4);
	if (legacyChange.type !== 'presence-changed') throw new Error('Invalid test');
	delete legacyChange.presenceVersion;
	legacyChange.userInfo.profile = { name: 'legacy' };
	await presence[HANDLE_MESSAGE](replica, legacyChange);
	await presence[HANDLE_MESSAGE](replica, snapshot(['A', 'B'], 2));
	expect(presence.peerIds).toEqual(['B']);
});

it('preserves a live join while a sync response is still processing', async () => {
	let finishData!: () => void;
	const dataReady = new Promise<void>((resolve) => {
		finishData = resolve;
	});
	const ctx = {
		log: vi.fn(),
		closing: false,
		waitForInitialization: new Promise(() => {}),
		internalEvents: { subscribe: () => () => {} },
		meta: Promise.resolve({
			getLocalReplica: async () => replica,
			updateLastSynced: async () => {},
		}),
	} as unknown as Context;
	const sync = new ServerSync(
		{
			authEndpoint: 'http://localhost/auth',
			initialPresence: {},
			defaultProfile: {},
			automaticTransportSelection: false,
			initialTransport: 'realtime',
		},
		{ ctx, onData: () => dataReady },
	);
	const response = sync['handleMessage'](snapshot(['A', 'B'], 1));
	await sync['handleMessage'](change('C', 2));
	finishData();
	await response;
	expect(sync.presence.peerIds).toEqual(['B', 'C']);
	sync.destroy();
});

it('resyncs on an epoch change only after the initial sync has completed', async () => {
	const message = {
		type: 'sync' as const,
		replicaId: replica.id,
		timestamp: '0',
		operations: [],
		baselines: [],
		schemaVersion: 1,
		since: null,
	};
	const ctx = {
		log: vi.fn(),
		waitForInitialization: new Promise(() => {}),
		internalEvents: { subscribe: () => () => {} },
		meta: Promise.resolve({
			messageCreator: { createSyncStep1: async () => message },
		}),
	} as unknown as Context;
	const sync = new ServerSync(
		{
			authEndpoint: 'http://localhost/auth',
			initialPresence: {},
			defaultProfile: {},
			automaticTransportSelection: false,
			initialTransport: 'realtime',
		},
		{ ctx, onData: async () => {} },
	);
	const transport = sync['activeSync'];
	vi.spyOn(transport, 'status', 'get').mockReturnValue('active');
	const hasSynced = vi
		.spyOn(transport, 'hasSynced', 'get')
		.mockReturnValue(false);
	const send = vi.spyOn(transport, 'send').mockImplementation(() => {});
	await sync.presence[HANDLE_MESSAGE](replica, snapshot(['A'], 1));
	await sync.presence[HANDLE_MESSAGE](replica, change('B', 1, 'second'));
	expect(send).not.toHaveBeenCalled();
	hasSynced.mockReturnValue(true);
	await sync.presence[HANDLE_MESSAGE](replica, change('C', 1, 'third'));
	await vi.waitFor(() => expect(send).toHaveBeenCalledWith(message));
	sync.destroy();
});
