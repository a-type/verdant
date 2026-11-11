import { afterEach, expect, it, vi } from 'vitest';
import { Backoff, BackoffScheduler } from '../BackoffScheduler.js';

afterEach(() => vi.useRealTimers());

it('allows a retry to be scheduled after a pending retry is reset', () => {
	vi.useFakeTimers();
	const scheduler = new BackoffScheduler(new Backoff(2_000, 60_000, 1.5));
	const trigger = vi.fn();
	scheduler.subscribe('trigger', trigger);

	scheduler.next();
	scheduler.reset();
	expect(scheduler.isScheduled).toBe(false);
	scheduler.next();
	vi.runOnlyPendingTimers();
	expect(trigger).toHaveBeenCalledTimes(1);
	expect(scheduler.isScheduled).toBe(false);
});

it('allows a retry to be scheduled from its trigger', () => {
	vi.useFakeTimers();
	const scheduler = new BackoffScheduler(new Backoff(2_000, 60_000, 1.5));
	const trigger = vi.fn(() => scheduler.next());
	scheduler.subscribe('trigger', trigger);

	scheduler.next();
	vi.advanceTimersByTime(2_000);
	expect(trigger).toHaveBeenCalledTimes(1);
	expect(scheduler.isScheduled).toBe(true);
	scheduler.reset();
});
