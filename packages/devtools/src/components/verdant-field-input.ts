import type { StorageFieldSchema } from '@verdant-web/common';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Renders an input appropriate to a field's schema (or a raw JSON textarea
 * if no schema is available, e.g. inside an `any` field), and emits a
 * `field-save` event with the parsed value when the user saves.
 */
@customElement('verdant-field-input')
export class VerdantFieldInput extends LitElement {
	static styles = css`
		:host {
			display: flex;
			gap: 6px;
			align-items: flex-start;
		}
		input,
		select,
		textarea {
			font: inherit;
			padding: 4px 6px;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			min-width: 0;
		}
		textarea {
			width: 100%;
			min-height: 60px;
			font-family: ui-monospace, monospace;
			font-size: 12px;
		}
		.row {
			display: flex;
			flex: 1;
			gap: 6px;
			min-width: 0;
		}
		input[type='text'],
		input[type='number'] {
			flex: 1;
			min-width: 0;
		}
		button {
			background: #f6f8fa;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			cursor: pointer;
			padding: 4px 10px;
			white-space: nowrap;
		}
		.error {
			color: #cf222e;
			font-size: 12px;
		}
	`;

	/** null means no schema constraint is known (e.g. inside an `any` field). */
	@property({ attribute: false })
	schema: StorageFieldSchema | null = null;

	@property({ attribute: false })
	value: unknown;

	@state()
	private draft = '';

	@state()
	private error: string | null = null;

	protected willUpdate(changed: Map<string, unknown>) {
		if (changed.has('value')) {
			this.draft = this.stringifyForEdit(this.value);
			this.error = null;
		}
	}

	private stringifyForEdit(value: unknown): string {
		if (!this.schema) return JSON.stringify(value, null, 2) ?? 'null';
		if (this.schema.type === 'string') return value == null ? '' : String(value);
		if (this.schema.type === 'number') return value == null ? '' : String(value);
		return JSON.stringify(value, null, 2) ?? 'null';
	}

	private save() {
		try {
			const value = this.parseDraft();
			this.error = null;
			this.dispatchEvent(
				new CustomEvent('field-save', { detail: { value } }),
			);
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
		}
	}

	private parseDraft(): unknown {
		const type = this.schema?.type;
		if (type === 'string') return this.draft;
		if (type === 'number') {
			const num = Number(this.draft);
			if (Number.isNaN(num)) throw new Error('Not a valid number');
			return num;
		}
		if (type === 'file') throw new Error('Files cannot be edited here');
		// boolean, object/array/map (shouldn't reach here), or `any`/unknown - parse as JSON
		return JSON.parse(this.draft);
	}

	private toggleBoolean() {
		this.dispatchEvent(
			new CustomEvent('field-save', { detail: { value: !this.value } }),
		);
	}

	render() {
		const type = this.schema?.type;

		if (type === 'boolean') {
			return html`
				<input
					type="checkbox"
					.checked=${!!this.value}
					@change=${() => this.toggleBoolean()}
				/>
			`;
		}

		if (type === 'file') {
			return html`<span>[file - not editable here]</span>`;
		}

		if (type === 'string' && this.schema?.options?.length) {
			return html`
				<div class="row">
					<select
						@change=${(e: Event) =>
							(this.draft = (e.target as HTMLSelectElement).value)}
					>
						${this.schema.options.map(
							(option) =>
								html`<option value=${option} ?selected=${option === this.value}>
									${option}
								</option>`,
						)}
					</select>
					<button @click=${() => this.save()}>Save</button>
				</div>
			`;
		}

		if (type === 'string') {
			return html`
				<div class="row">
					<input
						type="text"
						.value=${this.draft}
						@input=${(e: Event) =>
							(this.draft = (e.target as HTMLInputElement).value)}
						@keydown=${(e: KeyboardEvent) => {
							if (e.key === 'Enter') this.save();
						}}
					/>
					<button @click=${() => this.save()}>Save</button>
				</div>
				${this.error ? html`<div class="error">${this.error}</div>` : ''}
			`;
		}

		if (type === 'number') {
			return html`
				<div class="row">
					<input
						type="number"
						.value=${this.draft}
						@input=${(e: Event) =>
							(this.draft = (e.target as HTMLInputElement).value)}
						@keydown=${(e: KeyboardEvent) => {
							if (e.key === 'Enter') this.save();
						}}
					/>
					<button @click=${() => this.save()}>Save</button>
				</div>
				${this.error ? html`<div class="error">${this.error}</div>` : ''}
			`;
		}

		// No schema constraint (any) or unrecognized: raw JSON editing
		return html`
			<div class="row">
				<textarea
					.value=${this.draft}
					@input=${(e: Event) =>
						(this.draft = (e.target as HTMLTextAreaElement).value)}
				></textarea>
				<button @click=${() => this.save()}>Save</button>
			</div>
			${this.error ? html`<div class="error">${this.error}</div>` : ''}
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-field-input': VerdantFieldInput;
	}
}
