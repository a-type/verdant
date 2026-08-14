import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * A simple native <dialog>-based confirmation prompt. Fires a `confirm`
 * event when the user accepts.
 */
@customElement('verdant-confirm-dialog')
export class VerdantConfirmDialog extends LitElement {
	static styles = css`
		dialog {
			border: 1px solid #d0d7de;
			border-radius: 6px;
			padding: 16px;
			max-width: 360px;
			font: 13px/1.4 system-ui, sans-serif;
			color: #24292f;
		}
		dialog::backdrop {
			background: rgba(0, 0, 0, 0.3);
		}
		p {
			margin: 0 0 16px;
		}
		.actions {
			display: flex;
			gap: 8px;
			justify-content: flex-end;
		}
		button {
			border-radius: 4px;
			cursor: pointer;
			padding: 6px 12px;
			border: 1px solid #d0d7de;
		}
		.danger {
			background: #cf222e;
			border-color: #cf222e;
			color: white;
		}
		.cancel {
			background: #f6f8fa;
		}
	`;

	@property({ type: Boolean })
	open = false;

	@property()
	message = 'Are you sure?';

	@property()
	confirmLabel = 'Delete';

	@query('dialog')
	private dialogEl!: HTMLDialogElement;

	protected updated(changed: Map<string, unknown>) {
		if (changed.has('open')) {
			if (this.open && !this.dialogEl.open) this.dialogEl.showModal();
			else if (!this.open && this.dialogEl.open) this.dialogEl.close();
		}
	}

	private close() {
		this.dispatchEvent(new CustomEvent('close'));
	}

	private confirm() {
		this.dispatchEvent(new CustomEvent('confirm'));
	}

	render() {
		return html`
			<dialog @close=${() => this.close()} @cancel=${() => this.close()}>
				<p>${this.message}</p>
				<div class="actions">
					<button class="cancel" @click=${() => this.close()}>Cancel</button>
					<button class="danger" @click=${() => this.confirm()}>
						${this.confirmLabel}
					</button>
				</div>
			</dialog>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-confirm-dialog': VerdantConfirmDialog;
	}
}
