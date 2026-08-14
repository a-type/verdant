import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
	pollQueryDiagnostics,
	type QueryDiagnostics,
} from '../lib/diagnostics.js';
import { fetchCollectionPrimaryKeys } from '../lib/entityBridge.js';
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

	@state()
	private collectionPrimaryKeys: Record<string, string> | null = null;

	private stopPolling: (() => void) | null = null;
	private schemaPollHandle: number | null = null;

	connectedCallback() {
		super.connectedCallback();
		this.stopPolling = pollQueryDiagnostics((diagnostics) => {
			this.diagnostics = diagnostics;
		});
		this.refreshSchema();
		this.schemaPollHandle = window.setInterval(() => this.refreshSchema(), 5000);
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
				<verdant-query-list
					.queries=${this.diagnostics.queries}
					.collectionPrimaryKeys=${this.collectionPrimaryKeys}
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
