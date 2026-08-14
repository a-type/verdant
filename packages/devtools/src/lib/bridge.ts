declare const chrome: any;

export class InspectedWindowError extends Error {}

type EvalExceptionInfo = {
	isException?: boolean;
	isError?: boolean;
	code?: string;
	description?: string;
	value?: string;
};

/**
 * Evaluates a synchronous JavaScript expression in the inspected page and
 * returns its result. `devtools.inspectedWindow.eval` does NOT wait for
 * returned promises to settle (in Chrome or Firefox) - the expression must
 * resolve to its final value synchronously. For anything that needs to
 * await page-side async work (e.g. hydrating an entity), use `evalAsync`.
 */
function evalSync<T = unknown>(expression: string): Promise<T> {
	return new Promise((resolve, reject) => {
		chrome.devtools.inspectedWindow.eval(
			expression,
			(result: T, exceptionInfo?: EvalExceptionInfo) => {
				if (exceptionInfo?.isException || exceptionInfo?.isError) {
					reject(
						new InspectedWindowError(
							exceptionInfo.value ||
								exceptionInfo.description ||
								'Evaluation failed in the inspected page.',
						),
					);
					return;
				}
				resolve(result);
			},
		);
	});
}

/**
 * Evaluates a synchronous expression expected to return a JSON string, and
 * parses it. Used for values too complex to pass through eval's structured
 * clone directly (e.g. containing methods on their prototypes).
 */
export async function evalJson<T = unknown>(expression: string): Promise<T> {
	const raw = await evalSync<string | null>(expression);
	if (raw === null || raw === undefined) return null as T;
	return JSON.parse(raw) as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let requestCounter = 0;

/**
 * Runs `workExpression` (the body of an async function, ending in a
 * `return <value>;` statement) on the inspected page, and polls for its
 * result. This works around `devtools.inspectedWindow.eval` not waiting on
 * returned promises: the work is kicked off and its outcome is stashed on
 * a global registry on the page, which we then poll synchronously until
 * it settles.
 */
export async function evalAsync<T = unknown>(
	workExpression: string,
	{ pollIntervalMs = 30, timeoutMs = 10000 }: { pollIntervalMs?: number; timeoutMs?: number } = {},
): Promise<T> {
	const requestId = `req_${++requestCounter}_${Date.now()}`;
	const requestIdJson = JSON.stringify(requestId);

	await evalSync<boolean>(`
		(function () {
			if (!window.__VERDANT_DEVTOOLS_REQUESTS__) window.__VERDANT_DEVTOOLS_REQUESTS__ = {};
			var requests = window.__VERDANT_DEVTOOLS_REQUESTS__;
			requests[${requestIdJson}] = { status: 'pending' };
			(async () => {
				try {
					var value = await (async () => { ${workExpression} })();
					requests[${requestIdJson}] = {
						status: 'done',
						result: JSON.stringify(value === undefined ? null : value),
					};
				} catch (err) {
					requests[${requestIdJson}] = {
						status: 'error',
						error: (err && err.message) || String(err),
					};
				}
			})();
			return true;
		})()
	`);

	const start = Date.now();
	while (true) {
		if (Date.now() - start > timeoutMs) {
			throw new InspectedWindowError(
				'Timed out waiting for a response from the inspected page.',
			);
		}

		const stateJson = await evalSync<string | null>(`
			(function () {
				var requests = window.__VERDANT_DEVTOOLS_REQUESTS__;
				var entry = requests && requests[${requestIdJson}];
				if (!entry) return null;
				if (entry.status === 'pending') return JSON.stringify({ status: 'pending' });
				delete requests[${requestIdJson}];
				return JSON.stringify(entry);
			})()
		`);

		const state = stateJson
			? (JSON.parse(stateJson) as {
					status: 'pending' | 'done' | 'error';
					result?: string;
					error?: string;
				})
			: null;

		if (!state || state.status === 'pending') {
			await sleep(pollIntervalMs);
			continue;
		}

		if (state.status === 'error') {
			throw new InspectedWindowError(
				state.error || 'The inspected page reported an error.',
			);
		}

		if (state.result === undefined || state.result === null) return null as T;
		return JSON.parse(state.result) as T;
	}
}
