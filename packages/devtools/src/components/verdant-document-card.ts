import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { guessPrimaryKeyField } from '../lib/documents.js';
import './verdant-field-value.js';

/**
 * Renders a single document snapshot as a card, headed by its (best-guess)
 * primary key, with the remaining fields listed as key:value pairs.
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

	render() {
		const doc = this.document;
		const primaryKeyField = guessPrimaryKeyField(doc);
		const fields = Object.keys(doc).filter((key) => key !== primaryKeyField);

		return html`
			<div class="card">
				<header>
					<span class="key-label">${primaryKeyField ?? 'key'}</span>
					<span class="key-value"
						>${primaryKeyField ? String(doc[primaryKeyField]) : '?'}</span
					>
				</header>
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
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-document-card': VerdantDocumentCard;
	}
}
