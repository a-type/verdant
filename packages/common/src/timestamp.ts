import { v4 } from 'uuid';

export interface TimestampProvider {
	now(version: number): string;
	update(remoteTimestamp: string): void;
	zero(version: number): string;
}

const VERSION_BLOCK_LENGTH = 6;

function encodeVersion(version: number | string): string {
	return version.toString().padStart(VERSION_BLOCK_LENGTH, '0');
}

export class NaiveTimestampProvider implements TimestampProvider {
	counter = 0;
	now = (version: number | string) => {
		return encodeVersion(version) + Date.now().toString() + this.counter++;
	};
	update = () => {
		this.counter = 0;
	};
	zero = (version: number | string) => {
		return encodeVersion(version) + '0' + this.counter++;
	};
}

export class HybridLogicalClockTimestampProvider implements TimestampProvider {
	private latest: HLCTimestamp = {
		time: Date.now(),
		counter: 0,
		node: generateNodeId(),
	};
	private zeroCounter = 0;

	now = (version: string | number) => {
		this.latest = getHlcNow(this.latest);
		return encodeVersion(version) + serializeHlcTimestamp(this.latest);
	};
	update = (remoteTimestamp: string) => {
		// strip version from remote timestamp
		const hlcString = remoteTimestamp.slice(VERSION_BLOCK_LENGTH);
		this.latest = updateFromRemote(this.latest, deserializeHlcClock(hlcString));
	};
	zero = (version: string | number) => {
		return (
			encodeVersion(version) +
			serializeHlcTimestamp({
				time: 0,
				// to keep zero timestamps unique, we use a counter here as well
				counter: this.zeroCounter++,
				node: this.latest.node,
			})
		);
	};
}

class ClockDriftError extends Error {
	type: string;
	constructor(...args: any[]) {
		super();
		this.type = 'ClockDriftError';
		this.message = ['maximum clock drift exceeded'].concat(args).join(' ');
	}
}

class OverflowError extends Error {
	type: string;
	constructor() {
		super();
		this.type = 'OverflowError';
		this.message = 'timestamp counter overflow';
	}
}

interface HLCTimestamp {
	time: number;
	counter: number;
	node: string;
}

const COUNTER_BLOCK_LENGTH = 4;
const NODE_BLOCK_LENGTH = 16;
const MAX_CLOCK_DRIFT = 60 * 1000;

function generateNodeId() {
	return v4().replace(/-/g, '').slice(-16);
}

function serializeHlcTimestamp(ts: HLCTimestamp): string {
	// ISO string representation of the time
	const dateString = new Date(ts.time).toISOString();
	// counter, base16, padded to 4 characters
	const counter = ts.counter
		.toString(16)
		.toUpperCase()
		.padStart(COUNTER_BLOCK_LENGTH, '0');
	// node id padded to 16 characters
	const node = ts.node.padStart(NODE_BLOCK_LENGTH, '0');
	return `${dateString}-${counter}-${node}`;
}

function getHlcNow(prev: HLCTimestamp): HLCTimestamp {
	const wallTime = Date.now();

	// pick prev's time if it's later than our local device
	const newWallTime = Math.max(prev.time, wallTime);
	// reset counter if wall time changed
	const newCounter = prev.time === newWallTime ? prev.counter + 1 : 0;

	// check for drift
	if (newWallTime - wallTime > MAX_CLOCK_DRIFT) {
		throw new ClockDriftError(newWallTime, wallTime, MAX_CLOCK_DRIFT);
	}
	// check for counter overflow (max is 4 bytes)
	if (newCounter > 65535) {
		throw new OverflowError();
	}

	return {
		time: newWallTime,
		counter: newCounter,
		node: prev.node,
	};
}

function updateFromRemote(
	local: HLCTimestamp,
	remote: HLCTimestamp,
): HLCTimestamp {
	const wallTime = Date.now();
	// pick remote's time if it's later than our local device
	const newTime = Math.max(wallTime, Math.max(local.time, remote.time));

	const maxCounter = Math.max(local.counter, remote.counter);
	let newCounter;
	// if all clocks are the same, increment the counter
	if (local.time === newTime && remote.time === newTime) {
		newCounter = maxCounter + 1;
	}
	// if local time is the same as new time, increment our local counter
	else if (local.time === newTime) {
		newCounter = local.counter + 1;
	}
	// if remote time is the same as new time, increment remote counter
	else if (remote.time === newTime) {
		newCounter = remote.counter + 1;
	}
	// otherwise, reset the counter
	else {
		newCounter = 0;
	}

	// check for drift
	if (newTime - wallTime > MAX_CLOCK_DRIFT) {
		throw new ClockDriftError(newTime, wallTime, MAX_CLOCK_DRIFT);
	}
	if (newCounter > 65535) {
		throw new OverflowError();
	}

	return {
		time: newTime,
		counter: newCounter,
		node: local.node,
	};
}

function deserializeHlcClock(clock: string): HLCTimestamp {
	const [dateString, counter, node] = clock.split('-');
	const time = new Date(dateString).getTime();
	const counterNum = parseInt(counter, 16);

	if (isNaN(time) || isNaN(counterNum)) {
		throw new Error('invalid clock format');
	}

	return {
		time,
		counter: counterNum,
		node,
	};
}
