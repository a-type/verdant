import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { guessPrimaryKeyValue } from '../lib/documents.js';
import './verdant-document-card.js';

const PAGE_SIZE = 10;

/**
 * Renders a list of document snapshots as cards, paginated 10 per page.
 */
@customElement('verdant-document-list')
export class VerdantDocumentList extends LitElement {
	static styles = css`
		:host {
			display: block;
		}
		.cards {
			display: grid;
			gap: 8px;
		}
		.pagination {
			align-items: center;
			display: flex;
			gap: 8px;
			justify-content: center;
			margin-top: 10px;
		}
		.pagination button {
			background: #f6f8fa;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			cursor: pointer;
			padding: 4px 10px;
		}
		.pagination button:disabled {
			cursor: default;
			opacity: 0.5;
		}
		.pagination span {
			color: #57606a;
			font-variant-numeric: tabular-nums;
		}
	`;

	@property({ attribute: false })
	documents: Record<string, unknown>[] = [];

	@property()
	collection!: string;

	@property()
	primaryKeyField: string | null = null;

	@state()
	private page = 0;

	protected willUpdate(changed: Map<string, unknown>) {
		if (changed.has('documents')) {
			const maxPage = Math.max(0, this.pageCount - 1);
			if (this.page > maxPage) this.page = maxPage;
		}
	}

	private get pageCount() {
		return Math.max(1, Math.ceil(this.documents.length / PAGE_SIZE));
	}

	private goToPage(page: number) {
		this.page = Math.min(Math.max(page, 0), this.pageCount - 1);
	}

	render() {
		if (this.documents.length === 0) {
			return html`<p>No documents.</p>`;
		}

		const start = this.page * PAGE_SIZE;
		const pageDocuments = this.documents.slice(start, start + PAGE_SIZE);

		return html`
			<div class="cards">
				${repeat(
					pageDocuments,
					(doc, index) => guessPrimaryKeyValue(doc) ?? start + index,
					(doc) =>
						html`<verdant-document-card
							.document=${doc}
							.collection=${this.collection}
							.primaryKeyField=${this.primaryKeyField}
						></verdant-document-card>`,
				)}
			</div>
			${this.pageCount > 1 ? this.renderPagination() : ''}
		`;
	}

	private renderPagination() {
		return html`
			<div class="pagination">
				<button
					?disabled=${this.page === 0}
					@click=${() => this.goToPage(this.page - 1)}
				>
					Prev
				</button>
				<span>Page ${this.page + 1} of ${this.pageCount}</span>
				<button
					?disabled=${this.page >= this.pageCount - 1}
					@click=${() => this.goToPage(this.page + 1)}
				>
					Next
				</button>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-document-list': VerdantDocumentList;
	}
}
