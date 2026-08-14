import { evalJson } from './bridge.js';

export type QueryTiming = {
	sweep: number | null;
	hydration: number | null;
	total: number | null;
};

export type QueryDiagnostic = {
	key: string;
	collection: string;
	type: string;
	status: string;
	active: boolean;
	result: unknown;
	timing: QueryTiming;
};

export type QueryDiagnostics = {
	queries: QueryDiagnostic[];
};

/**
 * Polls the inspected window for Verdant client query diagnostics via the
 * chrome.devtools.inspectedWindow.eval bridge.
 */
export function fetchQueryDiagnostics(): Promise<QueryDiagnostics | null> {
	return evalJson<QueryDiagnostics | null>(
		'JSON.stringify(window.__VERDANT_CLIENT__?.queries.diagnostics ?? null)',
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
