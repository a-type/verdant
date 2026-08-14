import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { QueryDiagnostic, QueryHistory } from '../lib/diagnostics.js';
import { sharedStyles } from '../lib/format.js';
import './verdant-query-item.js';

@customElement('verdant-query-list')
export class VerdantQueryList extends LitElement {
	static styles = [
		sharedStyles,
		css`
			p {
				color: #57606a;
			}
		`,
	];

	@property({ attribute: false })
	queries: QueryDiagnostic[] = [];

	@property({ attribute: false })
	collectionPrimaryKeys: Record<string, string> | null = null;

	@property({ attribute: false })
	histories: Record<string, QueryHistory> = {};

	render() {
		if (this.queries.length === 0) {
			return html`<p>No queries have run yet.</p>`;
		}

		return repeat(
			this.queries,
			(query) => query.key,
			(query) =>
				html`<verdant-query-item
					id=${this.queryId(query.key)}
					.query=${query}
					.history=${this.histories[query.key]}
					.primaryKeyField=${this.collectionPrimaryKeys?.[query.collection] ??
					null}
				></verdant-query-item>`,
		);
	}

	private queryId(key: string) {
		return `query-${encodeURIComponent(key)}`;
	}

	scrollToQuery(key: string) {
		this.shadowRoot
			?.getElementById(this.queryId(key))
			?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-list': VerdantQueryList;
	}
}
