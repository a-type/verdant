import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { isPlainObject } from '../lib/documents.js';

/**
 * Renders a single field's value. Primitives are printed inline; objects
 * and arrays are rendered as a <details> disclosure containing their own
 * nested fields, recursively.
 */
@customElement('verdant-field-value')
export class VerdantFieldValue extends LitElement {
	static styles = css`
		:host {
			display: block;
		}
		details {
			margin: 2px 0;
		}
		summary {
			cursor: pointer;
			color: #57606a;
		}
		.nested {
			border-left: 2px solid #d0d7de;
			margin: 4px 0 4px 8px;
			padding-left: 10px;
		}
		.entry {
			display: flex;
			gap: 6px;
		}
		.entry > .key {
			color: #57606a;
			flex-shrink: 0;
		}
		.null {
			color: #8c959f;
			font-style: italic;
		}
	`;

	@property({ attribute: false })
	value: unknown;

	render() {
		return this.renderValue(this.value);
	}

	private renderValue(value: unknown) {
		if (value === null || value === undefined) {
			return html`<span class="null">${value === null ? 'null' : 'undefined'}</span>`;
		}

		if (Array.isArray(value)) {
			if (value.length === 0) return html`<span>[]</span>`;
			return html`
				<details>
					<summary>Array (${value.length})</summary>
					<div class="nested">
						${value.map(
							(item, index) => html`
								<div class="entry">
									<span class="key">${index}:</span>
									<verdant-field-value .value=${item}></verdant-field-value>
								</div>
							`,
						)}
					</div>
				</details>
			`;
		}

		if (isPlainObject(value)) {
			const keys = Object.keys(value);
			if (keys.length === 0) return html`<span>{}</span>`;
			return html`
				<details>
					<summary>Object (${keys.length})</summary>
					<div class="nested">
						${keys.map(
							(key) => html`
								<div class="entry">
									<span class="key">${key}:</span>
									<verdant-field-value .value=${value[key]}></verdant-field-value>
								</div>
							`,
						)}
					</div>
				</details>
			`;
		}

		return html`${String(value)}`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-field-value': VerdantFieldValue;
	}
}
