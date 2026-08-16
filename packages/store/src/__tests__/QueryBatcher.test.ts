import { describe, expect, it, vi } from 'vitest';
import { Context } from '../context/context.js';
import { enqueueQueryRun } from '../queries/QueryBatcher.js';

describe('QueryBatcher', () => {
	it('yields between batches of query runs', async () => {
		vi.useFakeTimers();
		const context = {} as Context;
		const runs = Array.from({ length: 21 }, () => vi.fn(async () => {}));

		const results = runs.map((run) => enqueueQueryRun(context, run));
		expect(runs.filter((run) => run.mock.calls.length > 0)).toHaveLength(0);

		await Promise.resolve();
		expect(runs.filter((run) => run.mock.calls.length > 0)).toHaveLength(20);

		await vi.runAllTimersAsync();
		expect(runs.filter((run) => run.mock.calls.length > 0)).toHaveLength(21);
		await Promise.all(results);
	});
});
