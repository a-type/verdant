import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { QueryDiagnostic } from '../lib/diagnostics.js';
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

	render() {
		if (this.queries.length === 0) {
			return html`<p>No queries have run yet.</p>`;
		}

		return repeat(
			this.queries,
			(query) => query.key,
			(query) => html`<verdant-query-item .query=${query}></verdant-query-item>`,
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-query-list': VerdantQueryList;
	}
}
