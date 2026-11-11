import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileLoader } from '../Profiles.js';
import { Presence, REPLICA_EXPIRATION_TIME } from './Presence.js';

describe('Presence replica tracking', () => {
	let presence: Presence;

	beforeEach(() => {
		vi.useFakeTimers();
		presence = new Presence(
			new UserProfileLoader({ get: async (id: string) => ({ id }) }),
		);
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	const update = (replicaId: string) =>
		presence.set('user', {
			id: 'user',
			replicaId,
			presence: {},
		});

	it('reports all recently active replicas for a user', async () => {
		await update('a');
		const info = await update('b');
		expect(info.replicaId).toBe('b');
		expect(info.replicaIds).toEqual(['a', 'b']);
		expect((await presence.all()).user.replicaIds).toEqual(['a', 'b']);
	});

	it('expires replicas which have not been seen recently', async () => {
		await update('a');
		vi.advanceTimersByTime(REPLICA_EXPIRATION_TIME / 2);
		await update('b');
		vi.advanceTimersByTime(REPLICA_EXPIRATION_TIME / 2 + 1);
		expect((await presence.get('user'))?.replicaIds).toEqual(['b']);
	});

	it('keeps replicas alive when touched', async () => {
		await update('a');
		await update('b');
		vi.advanceTimersByTime(REPLICA_EXPIRATION_TIME - 1000);
		await presence.touchReplica('user', 'a');
		vi.advanceTimersByTime(2000);
		expect((await presence.get('user'))?.replicaIds).toEqual(['a']);
	});

	it('removes a single replica', async () => {
		await update('a');
		await update('b');
		const updated = await presence.removeReplica('user', 'b');
		expect(updated?.replicaIds).toEqual(['a']);
		expect(updated?.replicaId).toBe('a');
		expect(await presence.removeReplica('user', 'a')).toBeUndefined();
	});

	it('serializes snapshots with presence updates and departures', async () => {
		const info = (id: string) => ({
			id,
			replicaId: `replica-${id}`,
			presence: {},
		});
		const a = presence.setWithVersion('a', info('a'));
		const first = presence.snapshot();
		const b = presence.setWithVersion('b', info('b'));
		const second = presence.snapshot();
		const [aUpdate, firstSnapshot, bUpdate, secondSnapshot] = await Promise.all(
			[a, first, b, second],
		);
		expect(firstSnapshot.presenceVersion).toEqual(aUpdate.presenceVersion);
		expect(Object.keys(firstSnapshot.peerPresence)).toEqual(['a']);
		expect(bUpdate.presenceVersion.revision).toBe(
			aUpdate.presenceVersion.revision + 1,
		);
		expect(secondSnapshot.presenceVersion).toEqual(bUpdate.presenceVersion);
		expect(Object.keys(secondSnapshot.peerPresence)).toEqual(['a', 'b']);

		const lost = vi.fn();
		presence.subscribe('lost', lost);
		await presence.remove('b');
		const afterRemoval = await presence.snapshot();
		expect(afterRemoval.presenceVersion.revision).toBe(
			bUpdate.presenceVersion.revision + 1,
		);
		expect(lost).toHaveBeenCalledWith('b', afterRemoval.presenceVersion);
		expect(Object.keys(afterRemoval.peerPresence)).toEqual(['a']);
	});
});
