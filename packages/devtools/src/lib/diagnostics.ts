import { evalJson } from './bridge.js';

export type QueryTiming = {
	sweep: number | null;
	hydration: number | null;
	total: number | null;
};

export type QueryDiagnostic = {
	key: string;
	startedAt: number | null;
	collection: string;
	type: string;
	status: string;
	active: boolean;
	result: unknown;
	timing: QueryTiming;
	runs?: QueryRun[];
};

export type QueryDiagnostics = {
	sessionId?: number;
	queries: QueryDiagnostic[];
};

export type QueryRun = QueryTiming & {
	key: string;
	startedAt: number;
};

export type QueryHistory = {
	initial: QueryRun;
	latest: QueryRun;
	runs: QueryRun[];
};

/**
 * Polls the inspected window for Verdant client query diagnostics via the
 * chrome.devtools.inspectedWindow.eval bridge.
 */
export function fetchQueryDiagnostics(): Promise<QueryDiagnostics | null> {
	return evalJson<QueryDiagnostics | null>(
		'JSON.stringify((() => { const diagnostics = window.__VERDANT_CLIENT__?.queries.diagnostics; return diagnostics ? { ...diagnostics, sessionId: performance.timeOrigin } : null; })())',
	).catch(() => null);
}

/**
 * Repeatedly invokes fetchQueryDiagnostics on an interval, calling the
 * callback with each result. Returns a function to stop polling.
 */
export function pollQueryDiagnostics(
	callback: (diagnostics: QueryDiagnostics | null) => void,
	intervalMs = 500,
): () => void {
	let cancelled = false;

	const tick = async () => {
		const diagnostics = await fetchQueryDiagnostics();
		if (!cancelled) callback(diagnostics);
	};

	tick();
	const handle = window.setInterval(tick, intervalMs);

	return () => {
		cancelled = true;
		window.clearInterval(handle);
	};
}
