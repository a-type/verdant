import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../context/context.js';
import { PresenceManager } from './PresenceManager.js';
import { TransportSelector } from './TransportSelector.js';
import type { AutomaticTransportSelection } from './TransportSelector.js';
import type { SyncTransportMode } from './Sync.js';

const gracePeriod = 10 * 60 * 1000;

function setup(
	selection: AutomaticTransportSelection,
	initial: SyncTransportMode,
	realtimeGracePeriod?: number,
) {
	const presence = new PresenceManager({
		initialPresence: {},
		defaultProfile: {},
		ctx: { waitForInitialization: new Promise(() => {}) } as Context,
	});
	const getViewPeers = vi.spyOn(presence, 'getViewPeers').mockReturnValue([]);
	let mode = initial;
	let allowed = true;
	const setMode = vi.fn((next: SyncTransportMode) => {
		mode = next;
		selector.modeChanged();
	});
	const selector = new TransportSelector({
		selection,
		realtimeGracePeriod,
		presence,
		getMode: () => mode,
		canDoRealtime: () => allowed,
		setMode,
	});
	selector.start();
	return {
		presence,
		selector,
		setMode,
		get mode() {
			return mode;
		},
		setAllowed(value: boolean) {
			allowed = value;
		},
		setPeer(present: boolean) {
			getViewPeers.mockReturnValue(present ? [presence.self] : []);
			presence.emit('peersChanged', {});
		},
		setOtherSelfReplica(present: boolean) {
			presence.selfReplicaIds.clear();
			presence.selfReplicaIds.add('local');
			if (present) presence.selfReplicaIds.add('other');
			presence.emit('selfChanged', presence.self);
		},
	};
}

describe('TransportSelector', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('waits exactly ten minutes from socket connection when alone', () => {
		const state = setup(true, 'realtime', gracePeriod);
		vi.advanceTimersByTime(gracePeriod);
		expect(state.mode).toBe('realtime');
		state.selector.socketOnlineChange(true);
		vi.advanceTimersByTime(gracePeriod - 1);
		expect(state.mode).toBe('realtime');
		vi.advanceTimersByTime(1);
		expect(state.mode).toBe('pull');
		state.selector.destroy();
	});

	it('cancels the timer on peer arrival and waits ten minutes after the last peer leaves', () => {
		const state = setup(true, 'realtime', gracePeriod);
		state.selector.socketOnlineChange(true);
		vi.advanceTimersByTime(gracePeriod - 1);
		state.setPeer(true);
		state.setOtherSelfReplica(true);
		vi.advanceTimersByTime(gracePeriod);
		state.setPeer(false);
		vi.advanceTimersByTime(gracePeriod);
		expect(state.mode).toBe('realtime');
		state.setOtherSelfReplica(false);
		vi.advanceTimersByTime(gracePeriod - 1);
		// Unrelated presence updates must not restart the idle period.
		state.presence.emit('selfChanged', state.presence.self);
		expect(state.mode).toBe('realtime');
		vi.advanceTimersByTime(1);
		expect(state.mode).toBe('pull');
		state.selector.destroy();
	});

	it('upgrades from pull and gives later socket connections a fresh grace period', () => {
		const state = setup(true, 'pull', gracePeriod);
		state.setPeer(true);
		expect(state.mode).toBe('realtime');
		state.selector.socketOnlineChange(true);
		state.setPeer(false);
		vi.advanceTimersByTime(gracePeriod - 1);
		state.selector.socketOnlineChange(false);
		vi.advanceTimersByTime(gracePeriod);
		expect(state.mode).toBe('realtime');
		state.selector.socketOnlineChange(true);
		vi.advanceTimersByTime(gracePeriod - 1);
		expect(state.mode).toBe('realtime');
		vi.advanceTimersByTime(1);
		expect(state.mode).toBe('pull');
		state.selector.destroy();
	});

	it('cancels timers and subscriptions when stopped or destroyed', () => {
		const state = setup(true, 'realtime', gracePeriod);
		state.selector.socketOnlineChange(true);
		state.selector.stop();
		vi.advanceTimersByTime(gracePeriod);
		expect(state.mode).toBe('realtime');
		state.selector.start();
		state.selector.socketOnlineChange(true);
		state.selector.destroy();
		vi.advanceTimersByTime(gracePeriod);
		state.setPeer(true);
		expect(state.setMode).not.toHaveBeenCalled();
		expect(state.presence.subscriberCount('peersChanged')).toBe(0);
		expect(state.presence.subscriberCount('selfChanged')).toBe(0);
	});

	it('preserves default and peers-only selection behavior', () => {
		const normal = setup(true, 'pull');
		normal.setOtherSelfReplica(true);
		expect(normal.mode).toBe('realtime');
		normal.selector.socketOnlineChange(true);
		normal.setOtherSelfReplica(false);
		vi.advanceTimersByTime(999);
		expect(normal.mode).toBe('realtime');
		vi.advanceTimersByTime(1);
		expect(normal.mode).toBe('pull');
		normal.selector.destroy();

		const peersOnly = setup('peers-only', 'pull');
		peersOnly.setOtherSelfReplica(true);
		expect(peersOnly.mode).toBe('pull');
		peersOnly.setPeer(true);
		expect(peersOnly.mode).toBe('realtime');
		peersOnly.selector.destroy();
	});

	it('does not automatically upgrade when disabled or realtime is forbidden', () => {
		const disabled = setup(false, 'pull');
		disabled.setPeer(true);
		expect(disabled.mode).toBe('pull');
		disabled.selector.destroy();
		const disabledRealtime = setup(false, 'realtime', 0);
		disabledRealtime.selector.socketOnlineChange(true);
		vi.advanceTimersByTime(1000);
		expect(disabledRealtime.mode).toBe('realtime');
		disabledRealtime.selector.destroy();
		const forbidden = setup(true, 'pull', gracePeriod);
		forbidden.setAllowed(false);
		forbidden.setPeer(true);
		expect(forbidden.mode).toBe('pull');
		forbidden.selector.destroy();
	});

	it('applies the configured delay with peers-only selection', () => {
		const state = setup('peers-only', 'realtime', 5000);
		state.selector.socketOnlineChange(true);
		state.setOtherSelfReplica(true);
		vi.advanceTimersByTime(4999);
		expect(state.mode).toBe('realtime');
		vi.advanceTimersByTime(1);
		expect(state.mode).toBe('pull');
		state.selector.destroy();
	});

	it('accepts zero and rejects invalid grace periods', () => {
		const state = setup(true, 'realtime', 0);
		state.selector.socketOnlineChange(true);
		vi.advanceTimersByTime(0);
		expect(state.mode).toBe('pull');
		state.selector.destroy();
		for (const period of [-1, NaN, Infinity, 2_147_483_648]) {
			expect(() => setup(true, 'pull', period)).toThrow(RangeError);
		}
	});
});
