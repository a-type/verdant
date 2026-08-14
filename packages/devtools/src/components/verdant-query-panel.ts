import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
	pollQueryDiagnostics,
	type QueryDiagnostics,
} from '../lib/diagnostics.js';
import { sharedStyles } from '../lib/format.js';
import './verdant-query-list.js';

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

	private stopPolling: (() => void) | null = null;

	connectedCallback() {
		super.connectedCallback();
		this.stopPolling = pollQueryDiagnostics((diagnostics) => {
			this.diagnostics = diagnostics;
		});
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.stopPolling?.();
		this.stopPolling = null;
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
				<verdant-query-list
					.queries=${this.diagnostics.queries}
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
