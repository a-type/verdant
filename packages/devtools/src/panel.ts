type QueryTiming = {
	sweep: number | null;
	hydration: number | null;
	total: number | null;
};

declare const chrome: any;

type QueryDiagnostic = {
	key: string;
	collection: string;
	type: string;
	status: string;
	active: boolean;
	result: unknown;
	timing: QueryTiming;
};

type QueryDiagnostics = {
	queries: QueryDiagnostic[];
};

class VerdantQueryPanel extends HTMLElement {
	private diagnostics: QueryDiagnostics | null = null;

	connectedCallback() {
		this.render();
		window.setInterval(() => this.refresh(), 500);
		this.refresh();
	}

	private refresh = () => {
		chrome.devtools.inspectedWindow.eval(
			'JSON.stringify(window.__VERDANT_CLIENT__?.queries.diagnostics ?? null)',
			(result: unknown, exceptionInfo: { isException?: boolean }) => {
				if (exceptionInfo?.isException || typeof result !== 'string') return;
				this.diagnostics = JSON.parse(result) as QueryDiagnostics | null;
				this.render();
			},
		);
	};

	private formatTiming(value: number | null) {
		return value === null ? '-' : `${value.toFixed(1)} ms`;
	}

	private render() {
		if (!this.diagnostics) {
			this.innerHTML = `<style>${styles}</style><main><p>Waiting for a Verdant client...</p></main>`;
			return;
		}

		const queries = this.diagnostics.queries
			.map(
				(query) => `<article class="query ${query.active ? 'active' : 'inactive'}">
			<header><code>${escapeHtml(query.key)}</code><span>${query.active ? 'active' : 'inactive'}</span></header>
			<dl><div><dt>Type</dt><dd>${escapeHtml(query.type)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(query.status)}</dd></div><div><dt>Sweep</dt><dd>${this.formatTiming(query.timing.sweep)}</dd></div><div><dt>Hydration</dt><dd>${this.formatTiming(query.timing.hydration)}</dd></div><div><dt>Total</dt><dd>${this.formatTiming(query.timing.total)}</dd></div></dl>
			<pre>${escapeHtml(JSON.stringify(query.result, null, 2))}</pre>
		</article>`,
			)
			.join('');

		this.innerHTML = `<style>${styles}</style><main><header class="title"><h1>Queries</h1><span>${this.diagnostics.queries.length}</span></header>${queries || '<p>No queries have run yet.</p>'}</main>`;
	}
}

const escapeHtml = (value: string) =>
	value.replace(/[&<>'"]/g, (character) =>
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
			character
		]!,
	);

const styles = `
	:host { color: #24292f; font: 13px/1.4 system-ui, sans-serif; }
	main { margin: 0 auto; max-width: 960px; padding: 16px; }
	.title, .query > header { align-items: center; display: flex; justify-content: space-between; }
	h1 { font-size: 16px; margin: 0; }
	.title > span, .query > header span { background: #f1f3f5; border-radius: 12px; padding: 2px 8px; }
	.query { border: 1px solid #d0d7de; border-left: 3px solid #8c959f; margin-top: 12px; padding: 12px; }
	.query.active { border-left-color: #1a7f37; }
	code { overflow-wrap: anywhere; }
	dl { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 12px 0; }
	dt { color: #57606a; }
	dd { font-variant-numeric: tabular-nums; margin: 0; }
	pre { background: #f6f8fa; margin: 0; max-height: 260px; overflow: auto; padding: 10px; white-space: pre-wrap; }
	@media (max-width: 500px) { main { padding: 10px; } .query { padding: 8px; } }
`;

customElements.define('verdant-query-panel', VerdantQueryPanel);
