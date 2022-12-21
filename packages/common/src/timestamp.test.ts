import { describe, expect, it, vitest } from 'vitest';
import {
	convertOldHlcTimestamp,
	HybridLogicalClockTimestampProvider,
	OLD_encodeVersion,
	OLD_serializeHlcTimestamp,
	serializeHlcTimestamp,
} from './timestamp.js';

describe('the hybrid logical clock', () => {
	it('always produces incrementing timestamps', async () => {
		const clock = new HybridLogicalClockTimestampProvider();
		let prev = clock.now(1);

		clock.update(prev);
		let now;
		for (let i = 0; i < 1000; i++) {
			now = clock.now(1);
			expect(now > prev, `${now} not later than ${prev}`).toBe(true);
			clock.update(now);
			prev = now;
		}

		let time = new Date().getTime();
		for (let i = 0; i < 1000; i++) {
			vitest.setSystemTime(time++);
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

	it('is shorter than the previous format', () => {
		const clock = new HybridLogicalClockTimestampProvider();

		expect(clock.now(1).length).toBeLessThan(clock.OLD_now(1).length);
	});

	it('correctly converts old to new format', () => {
		const clock = new HybridLogicalClockTimestampProvider();
		const oldFormat = clock.OLD_now(1);
		const value = clock.timerState();
		const converted = convertOldHlcTimestamp(oldFormat);
		const newFormat = clock.get(1, value);
		expect(converted).toEqual(newFormat);
	});

	// this is mostly to verify as I move to the new format.
	// instead of attempting a distributed migration of timestamps, it
	// will be easier that the new format just acts as always in the
	// future of the old one. this will only mess with offline clients,
	// but nobody is using lo-fi but me yet at time of this change (2022-12-19)
	// which is kind of why I'm doing it now anyway.
	it('old format always comes before new format', () => {
		const clock = new HybridLogicalClockTimestampProvider();
		const newFormat = clock.now(1);
		const oldFormat = clock.OLD_now(1);
		expect(oldFormat < newFormat).toBe(true);

		// even far-future old timestamps are before new timestamps
		const oldFormat2 = OLD_serializeHlcTimestamp({
			counter: 999,
			node: '9876543210',
			time: new Date(3000, 1, 1).getTime(),
		});
		expect(OLD_encodeVersion(1) + oldFormat2 < newFormat).toBe(true);
	});
});
