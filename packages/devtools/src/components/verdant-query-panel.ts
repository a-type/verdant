import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
	pollQueryDiagnostics,
	type QueryHistory,
	type QueryRun,
	type QueryDiagnostics,
} from '../lib/diagnostics.js';
import { fetchCollectionPrimaryKeys } from '../lib/entityBridge.js';
import { sharedStyles } from '../lib/format.js';
import './verdant-query-list.js';
import './verdant-query-timeline.js';

@customElement('verdant-query-panel')
export class VerdantQueryPanel extends LitElement {
	static styles = [
		sharedStyles,
		css`
			main {
				margin: 0 auto;
				max-width: 960px;
				padding: 16px;
			}
			.title {
				align-items: center;
				display: flex;
				justify-content: space-between;
			}
			h1 {
				font-size: 16px;
				margin: 0;
			}
			.title > span {
				background: #f1f3f5;
				border-radius: 12px;
				padding: 2px 8px;
			}
			@media (max-width: 500px) {
				main {
					padding: 10px;
				}
			}
		`,
	];

	@state()
	private diagnostics: QueryDiagnostics | null = null;

	@state()
	private collectionPrimaryKeys: Record<string, string> | null = null;

	@state()
	private queryHistories: Record<string, QueryHistory> = {};

	private stopPolling: (() => void) | null = null;
	private schemaPollHandle: number | null = null;
	private diagnosticsSessionId: number | null = null;

	private recordDiagnostics(diagnostics: QueryDiagnostics | null) {
		this.diagnostics = diagnostics;
		if (!diagnostics) return;
		if (
			this.diagnosticsSessionId !== null &&
			diagnostics.sessionId !== undefined &&
			diagnostics.sessionId !== this.diagnosticsSessionId
		) {
			this.queryHistories = {};
		}
		if (diagnostics.sessionId !== undefined) {
			this.diagnosticsSessionId = diagnostics.sessionId;
		}
		const observedAt = Date.now();
		const histories = { ...this.queryHistories };
		for (const query of diagnostics.queries) {
			const runs = (query.runs ?? [])
				.filter((run) => Number.isFinite(run.startedAt))
				.map((run) => ({ ...run, key: query.key }));
			if (runs.length === 0) {
				runs.push({
					key: query.key,
					startedAt: Number.isFinite(query.startedAt)
						? query.startedAt!
						: observedAt,
					...query.timing,
				});
			}
			const history = histories[query.key];
			if (!history) {
				const initial = runs[0];
				const latest = runs[runs.length - 1];
				histories[query.key] = { initial, latest, runs };
			} else if (runs.length > history.runs.length) {
				const latest = runs[runs.length - 1];
				histories[query.key] = {
					initial: history.initial,
					latest,
					runs: [...history.runs, ...runs.slice(history.runs.length)],
				};
			} else {
				const latest = runs[runs.length - 1];
				histories[query.key] = {
					...history,
					latest,
					runs: [...history.runs.slice(0, -1), latest],
				};
			}
		}
		this.queryHistories = histories;
	}

	connectedCallback() {
		super.connectedCallback();
		this.stopPolling = pollQueryDiagnostics((diagnostics) => {
			this.recordDiagnostics(diagnostics);
		});
		this.refreshSchema();
		this.schemaPollHandle = window.setInterval(
			() => this.refreshSchema(),
			5000,
		);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.stopPolling?.();
		this.stopPolling = null;
		if (this.schemaPollHandle !== null) {
			window.clearInterval(this.schemaPollHandle);
			this.schemaPollHandle = null;
		}
	}

	private async refreshSchema() {
		try {
			this.collectionPrimaryKeys = await fetchCollectionPrimaryKeys();
		} catch {
			// client may not be connected yet - diagnostics polling will surface that
		}
	}

	render() {
		if (!this.diagnostics) {
			return html`<main>
				<p>Waiting for a Verdant client...</p>
			</main>`;
		}

		return html`
			<main>
				<header class="title">
					<h1>Queries</h1>
					<span>${this.diagnostics.queries.length}</span>
				</header>
				<verdant-query-timeline
					.runs=${Object.values(this.queryHistories).flatMap(
						(history) => history.runs,
					)}
					@query-timeline-select=${(event: CustomEvent<string>) => {
						(
							this.shadowRoot?.querySelector(
								'verdant-query-list',
							) as HTMLElement & { scrollToQuery: (key: string) => void }
						)?.scrollToQuery(event.detail);
					}}
				></verdant-query-timeline>
				<verdant-query-list
					.queries=${this.diagnostics.queries}
					.collectionPrimaryKeys=${this.collectionPrimaryKeys}
					.histories=${this.queryHistories}
				></verdant-query-list>
			</main>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-panel': VerdantQueryPanel;
	}
}
