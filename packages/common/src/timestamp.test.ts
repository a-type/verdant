import { describe, expect, it } from 'vitest';
import { HybridLogicalClockTimestampProvider } from './timestamp.js';

describe('the hybrid logical clock', () => {
	it('always produces incrementing timestamps', () => {
		const clock = new HybridLogicalClockTimestampProvider();
		let prev = clock.now(1);
		clock.update(prev);
		let now;
		for (let i = 0; i < 100; i++) {
			now = clock.now(1);
			expect(now > prev, `${now} not later than ${prev}`).toBe(true);
			clock.update(now);
			prev = now;
		}
	});

	it('groups blocks of time by version', () => {
		const clock = new HybridLogicalClockTimestampProvider();
		let prev = clock.now(1);
		clock.update(prev);
		let now: string;
		for (let i = 0; i < 10; i++) {
			now = clock.now(1);
			expect(now > prev, `${now} not later than ${prev}`).toBe(true);
			clock.update(now);
			prev = now;
		}
		for (let i = 0; i < 10; i++) {
			now = clock.now(2);
			expect(now > prev, `${now} not later than ${prev}`).toBe(true);
			clock.update(now);
			prev = now;
		}
		const startOfVersion2 = now!;
		// jump back to 1
		prev = clock.now(1);
		clock.update(prev);

		for (let i = 0; i < 10; i++) {
			now = clock.now(1);
			expect(now > prev, `${now} not later than ${prev}`).toBe(true);
			expect(
				now < startOfVersion2,
				`${now} not earlier than ${startOfVersion2}`,
			).toBe(true);
			clock.update(now);
			prev = now;
		}
	});
});
