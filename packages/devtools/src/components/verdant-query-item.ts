import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QueryDiagnostic, QueryHistory } from '../lib/diagnostics.js';
import { isDocumentList, isPlainObject } from '../lib/documents.js';
import { formatTiming, sharedStyles } from '../lib/format.js';
import './verdant-document-card.js';
import './verdant-document-list.js';

@customElement('verdant-query-item')
export class VerdantQueryItem extends LitElement {
	static styles = [
		sharedStyles,
		css`
			.query {
				border: 1px solid #d0d7de;
				border-left: 3px solid #8c959f;
				margin-top: 12px;
			}
			.query.active {
				border-left-color: #1a7f37;
			}
			summary {
				cursor: pointer;
				list-style-position: inside;
				padding: 12px;
			}
			.summary-header {
				align-items: center;
				display: flex;
				justify-content: space-between;
			}
			.timing-summary {
				color: #57606a;
				display: flex;
				flex-wrap: wrap;
				font-size: 12px;
				gap: 4px 12px;
				margin-left: 20px;
			}
			.timing-summary strong {
				color: #24292f;
			}
			summary span {
				background: #f1f3f5;
				border-radius: 12px;
				padding: 2px 8px;
			}
			.details {
				padding: 0 12px 12px;
			}
			code {
				overflow-wrap: anywhere;
			}
			dl {
				display: flex;
				flex-wrap: wrap;
				gap: 12px 24px;
				margin: 12px 0;
			}
			dt {
				color: #57606a;
			}
			dd {
				font-variant-numeric: tabular-nums;
				margin: 0;
			}
			pre {
				background: #f6f8fa;
				margin: 0;
				max-height: 260px;
				overflow: auto;
				padding: 10px;
				white-space: pre-wrap;
			}
			@media (max-width: 500px) {
				.details {
					padding: 0 8px 8px;
				}
				summary {
					padding: 8px;
				}
			}
		`,
	];

	@property({ attribute: false })
	query!: QueryDiagnostic;

	@property({ attribute: false })
	history!: QueryHistory | undefined;

	@property()
	primaryKeyField: string | null = null;

	render() {
		const { query } = this;
		return html`
			<details class="query ${query.active ? 'active' : 'inactive'}">
				<summary>
					<div class="summary-header">
						<code>${query.key}</code>
						<span>${query.active ? 'active' : 'inactive'}</span>
					</div>
					<dl>
						<div>
							<dt>Type</dt>
							<dd>${query.type}</dd>
						</div>
						<div>
							<dt>Status</dt>
							<dd>${query.status}</dd>
						</div>
						<div>
							<dt>Sweep</dt>
							<dd>${formatTiming(query.timing.sweep)}</dd>
						</div>
						<div>
							<dt>Hydration</dt>
							<dd>${formatTiming(query.timing.hydration)}</dd>
						</div>
						<div>
							<dt>Total</dt>
							<dd>${formatTiming(query.timing.total)}</dd>
						</div>
					</dl>
				</summary>
				${this.renderTimingSummary()}
				<div class="details">${this.renderResult()}</div>
			</details>
		`;
	}

	private renderTimingSummary() {
		const history = this.history;
		if (!history) return '';
		return html`
			<div class="timing-summary">
				<strong>Initial</strong>${this.renderTimingValues(history.initial)}
			</div>
			<div class="timing-summary">
				<strong>Latest</strong>${this.renderTimingValues(history.latest)}
			</div>
		`;
	}

	private renderTimingValues(timing: {
		sweep: number | null;
		hydration: number | null;
		total: number | null;
	}) {
		return html`<span>Sweep ${formatTiming(timing.sweep)}</span
			><span>Hydrate ${formatTiming(timing.hydration)}</span
			><span>Total ${formatTiming(timing.total)}</span>`;
	}

	private renderResult() {
		const { result } = this.query;

		if (isDocumentList(result)) {
			return html`<verdant-document-list
				.documents=${result}
				.collection=${this.query.collection}
				.primaryKeyField=${this.primaryKeyField}
			></verdant-document-list>`;
		}

		if (isPlainObject(result)) {
			return html`<verdant-document-card
				.document=${result}
				.collection=${this.query.collection}
				.primaryKeyField=${this.primaryKeyField}
			></verdant-document-card>`;
		}

		return html`<pre>${JSON.stringify(result, null, 2)}</pre>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-item': VerdantQueryItem;
	}
}
