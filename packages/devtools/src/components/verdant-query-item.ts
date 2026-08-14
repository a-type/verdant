import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QueryDiagnostic } from '../lib/diagnostics.js';
import { formatTiming, sharedStyles } from '../lib/format.js';

@customElement('verdant-query-item')
export class VerdantQueryItem extends LitElement {
	static styles = [
		sharedStyles,
		css`
			.query {
				border: 1px solid #d0d7de;
				border-left: 3px solid #8c959f;
				margin-top: 12px;
				padding: 12px;
			}
			.query.active {
				border-left-color: #1a7f37;
			}
			header {
				align-items: center;
				display: flex;
				justify-content: space-between;
			}
			header span {
				background: #f1f3f5;
				border-radius: 12px;
				padding: 2px 8px;
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
				.query {
					padding: 8px;
				}
			}
		`,
	];

	@property({ attribute: false })
	query!: QueryDiagnostic;

	render() {
		const { query } = this;
		return html`
			<article class="query ${query.active ? 'active' : 'inactive'}">
				<header>
					<code>${query.key}</code>
					<span>${query.active ? 'active' : 'inactive'}</span>
				</header>
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
				<pre>${JSON.stringify(query.result, null, 2)}</pre>
			</article>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-item': VerdantQueryItem;
	}
}
