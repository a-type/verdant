import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { guessPrimaryKeyField } from '../lib/documents.js';
import { deleteDocument } from '../lib/entityBridge.js';
import './verdant-confirm-dialog.js';
import './verdant-edit-dialog.js';
import './verdant-field-value.js';

/**
 * Renders a single document snapshot as a card, headed by its primary key,
 * with the remaining fields listed as key:value pairs, plus actions to
 * edit or delete the underlying entity.
 */
@customElement('verdant-document-card')
export class VerdantDocumentCard extends LitElement {
	static styles = css`
		:host {
			display: block;
		}
		.card {
			border: 1px solid #d0d7de;
			padding: 10px 12px;
		}
		header {
			align-items: baseline;
			border-bottom: 1px solid #d0d7de;
			display: flex;
			gap: 6px;
			margin-bottom: 8px;
			padding-bottom: 6px;
		}
		header .key-label {
			color: #57606a;
			font-size: 11px;
			text-transform: uppercase;
		}
		header .key-value {
			font-weight: 600;
			overflow-wrap: anywhere;
			flex: 1;
		}
		header .actions {
			display: flex;
			gap: 6px;
		}
		button {
			background: #f6f8fa;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			cursor: pointer;
			padding: 3px 8px;
			font-size: 12px;
		}
		button.delete {
			color: #cf222e;
		}
		dl {
			display: grid;
			gap: 4px 12px;
			grid-template-columns: max-content 1fr;
			margin: 0;
		}
		dt {
			color: #57606a;
		}
		dd {
			margin: 0;
			overflow-wrap: anywhere;
		}
	`;

	@property({ attribute: false })
	document!: Record<string, unknown>;

	@property()
	collection!: string;

	/** The real primary key field name, if known from the live schema. */
	@property()
	primaryKeyField: string | null = null;

	@state()
	private editOpen = false;

	@state()
	private confirmDeleteOpen = false;

	@state()
	private deleteError: string | null = null;

	private get resolvedPrimaryKeyField() {
		return this.primaryKeyField ?? guessPrimaryKeyField(this.document);
	}

	private async confirmDelete() {
		this.confirmDeleteOpen = false;
		const field = this.resolvedPrimaryKeyField;
		if (!field) return;
		try {
			await deleteDocument(this.collection, this.document[field]);
		} catch (err) {
			this.deleteError = err instanceof Error ? err.message : String(err);
		}
	}

	render() {
		const doc = this.document;
		const primaryKeyField = this.resolvedPrimaryKeyField;
		const primaryKeyValue = primaryKeyField ? doc[primaryKeyField] : undefined;
		const fields = Object.keys(doc).filter((key) => key !== primaryKeyField);

		return html`
			<div class="card">
				<header>
					<span class="key-label">${primaryKeyField ?? 'key'}</span>
					<span class="key-value"
						>${primaryKeyField ? String(primaryKeyValue) : '?'}</span
					>
					<div class="actions">
						<button @click=${() => (this.editOpen = true)}>Edit</button>
						<button
							class="delete"
							@click=${() => (this.confirmDeleteOpen = true)}
						>
							Delete
						</button>
					</div>
				</header>
				${this.deleteError
					? html`<p style="color:#cf222e">${this.deleteError}</p>`
					: ''}
				<dl>
					${fields.map(
						(field) => html`
							<dt>${field}</dt>
							<dd>
								<verdant-field-value .value=${doc[field]}></verdant-field-value>
							</dd>
						`,
					)}
				</dl>
			</div>
			${this.editOpen
				? html`
						<verdant-edit-dialog
							.collection=${this.collection}
							.primaryKey=${primaryKeyValue}
							.path=${[]}
							.primaryKeyField=${primaryKeyField}
							.label=${`Edit ${this.collection} (${primaryKeyField}: ${primaryKeyValue})`}
							.open=${true}
							@close=${() => (this.editOpen = false)}
						></verdant-edit-dialog>
					`
				: nothing}
			<verdant-confirm-dialog
				.open=${this.confirmDeleteOpen}
				message=${`Delete this ${this.collection} document (${primaryKeyField}: ${primaryKeyValue})? This cannot be undone.`}
				confirmLabel="Delete"
				@confirm=${() => this.confirmDelete()}
				@close=${() => (this.confirmDeleteOpen = false)}
			></verdant-confirm-dialog>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-document-card': VerdantDocumentCard;
	}
}
