import type { StorageFieldSchema } from '@verdant-web/common';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
	deleteEntityField,
	fetchEntityNode,
	pushEntityItem,
	setEntityField,
} from '../lib/entityBridge.js';
import {
	containerKindOf,
	defaultValueForSchema,
	getChildSchema,
	isChildDeletable,
	isContainerSchema,
	isContainerValue,
	type EntityPath,
} from '../lib/entitySchema.js';
import './verdant-field-input.js';

type Row = {
	key: string | number;
	label: string;
	value: unknown;
	childSchema: StorageFieldSchema | null;
	isContainer: boolean;
	deletable: boolean;
};

/**
 * Recursively edits a container entity (object/array/map/any) at `path`.
 * Primitive fields are edited inline; object/array/map children open a
 * nested instance of this same dialog.
 */
@customElement('verdant-edit-dialog')
export class VerdantEditDialog extends LitElement {
	static styles = css`
		dialog {
			border: 1px solid #d0d7de;
			border-radius: 6px;
			padding: 16px;
			width: min(560px, 90vw);
			max-height: 80vh;
			overflow: auto;
			font: 13px/1.4 system-ui, sans-serif;
			color: #24292f;
		}
		dialog::backdrop {
			background: rgba(0, 0, 0, 0.3);
		}
		header {
			align-items: center;
			display: flex;
			justify-content: space-between;
			margin-bottom: 12px;
		}
		h2 {
			font-size: 14px;
			margin: 0;
			overflow-wrap: anywhere;
		}
		.close {
			background: none;
			border: none;
			cursor: pointer;
			font-size: 16px;
			line-height: 1;
			padding: 2px 6px;
		}
		table {
			border-collapse: collapse;
			width: 100%;
		}
		td {
			border-top: 1px solid #eaeef2;
			padding: 8px 4px;
			vertical-align: top;
		}
		.key-cell {
			color: #57606a;
			padding-right: 8px;
			white-space: nowrap;
			width: 1%;
		}
		.readonly {
			color: #8c959f;
		}
		.actions-cell {
			text-align: right;
			white-space: nowrap;
			width: 1%;
		}
		button {
			background: #f6f8fa;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			cursor: pointer;
			padding: 4px 10px;
		}
		button.delete {
			color: #cf222e;
		}
		.footer {
			display: flex;
			gap: 8px;
			margin-top: 12px;
		}
		.add-entry {
			align-items: center;
			display: flex;
			gap: 6px;
			margin-top: 12px;
		}
		.add-entry input {
			flex: 1;
			font: inherit;
			padding: 4px 6px;
			border: 1px solid #d0d7de;
			border-radius: 4px;
		}
		.error {
			background: #fff8f0;
			border: 1px solid #d0d7de;
			border-radius: 4px;
			color: #cf222e;
			margin-bottom: 12px;
			padding: 8px;
		}
		.empty {
			color: #57606a;
		}
	`;

	@property({ attribute: false })
	collection!: string;

	@property({ attribute: false })
	primaryKey: unknown;

	@property({ attribute: false })
	path: EntityPath = [];

	@property()
	label = 'Edit';

	/** Only relevant when `path` is the document root - this field is
	 * never editable or deletable. */
	@property()
	primaryKeyField: string | null = null;

	@property({ type: Boolean })
	open = false;

	@query('dialog')
	private dialogEl!: HTMLDialogElement;

	@state()
	private schema: StorageFieldSchema | null = null;

	@state()
	private snapshot: unknown = undefined;

	@state()
	private loading = false;

	@state()
	private error: string | null = null;

	@state()
	private childDialog: { path: EntityPath; label: string } | null = null;

	@state()
	private newEntryKey = '';

	protected updated(changed: Map<string, unknown>) {
		if (changed.has('open')) {
			if (this.open) {
				this.refresh();
				if (!this.dialogEl.open) this.dialogEl.showModal();
			} else if (this.dialogEl.open) {
				this.dialogEl.close();
			}
		}
	}

	private async refresh() {
		this.loading = true;
		this.error = null;
		try {
			const node = await fetchEntityNode(
				this.collection,
				this.primaryKey,
				this.path,
			);
			this.schema = node?.schema ?? null;
			this.snapshot = node?.snapshot;
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
		}
	}

	private closeSelf() {
		this.dispatchEvent(new CustomEvent('close'));
	}

	private async runMutation(fn: () => Promise<void>) {
		this.error = null;
		try {
			await fn();
			await this.refresh();
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
		}
	}

	private saveField(row: Row, value: unknown) {
		this.runMutation(() =>
			setEntityField(this.collection, this.primaryKey, this.path, row.key, value),
		);
	}

	private deleteField(row: Row) {
		this.runMutation(() =>
			deleteEntityField(this.collection, this.primaryKey, this.path, row.key),
		);
	}

	private addListItem() {
		if (!this.schema || this.schema.type !== 'array') return;
		const value = defaultValueForSchema(this.schema.items);
		this.runMutation(() =>
			pushEntityItem(this.collection, this.primaryKey, this.path, value),
		);
	}

	private addEntry() {
		const key = this.newEntryKey.trim();
		if (!key) return;
		const valueSchema =
			this.schema?.type === 'map' ? this.schema.values : null;
		const value = defaultValueForSchema(valueSchema);
		this.newEntryKey = '';
		this.runMutation(() =>
			setEntityField(this.collection, this.primaryKey, this.path, key, value),
		);
	}

	private openChild(row: Row) {
		this.childDialog = {
			path: [...this.path, row.key],
			label: row.label,
		};
	}

	private closeChild() {
		this.childDialog = null;
		// the child dialog may have changed our own data
		this.refresh();
	}

	private getRows(): Row[] {
		if (!this.schema) return [];
		const kind = containerKindOf(this.schema);

		if (kind === 'object') {
			const properties = (this.schema as any).properties as Record<
				string,
				StorageFieldSchema
			>;
			const snapshotObj = (this.snapshot as Record<string, unknown>) ?? {};
			return Object.keys(properties).map((key) => {
				const childSchema = properties[key];
				return {
					key,
					label: key,
					value: snapshotObj[key],
					childSchema,
					isContainer: isContainerSchema(childSchema),
					deletable:
						key !== this.primaryKeyField &&
						isChildDeletable('object', childSchema),
				};
			});
		}

		if (kind === 'array') {
			const items = (this.snapshot as unknown[]) ?? [];
			const childSchema = (this.schema as any).items as StorageFieldSchema;
			return items.map((value, index) => ({
				key: index,
				label: `[${index}]`,
				value,
				childSchema,
				isContainer: isContainerSchema(childSchema),
				deletable: true,
			}));
		}

		if (kind === 'map') {
			const obj = (this.snapshot as Record<string, unknown>) ?? {};
			const childSchema = (this.schema as any).values as StorageFieldSchema;
			return Object.keys(obj).map((key) => ({
				key,
				label: key,
				value: obj[key],
				childSchema,
				isContainer: isContainerSchema(childSchema),
				deletable: true,
			}));
		}

		// 'any' - fully dynamic, introspected at runtime
		if (Array.isArray(this.snapshot)) {
			return this.snapshot.map((value, index) => ({
				key: index,
				label: `[${index}]`,
				value,
				childSchema: null,
				isContainer: isContainerValue(value),
				deletable: true,
			}));
		}
		if (isContainerValue(this.snapshot)) {
			const obj = this.snapshot as Record<string, unknown>;
			return Object.keys(obj).map((key) => ({
				key,
				label: key,
				value: obj[key],
				childSchema: null,
				isContainer: isContainerValue(obj[key]),
				deletable: true,
			}));
		}

		return [];
	}

	render() {
		const rows = this.getRows();
		const kind = this.schema ? containerKindOf(this.schema) : 'any';

		return html`
			<dialog @close=${() => this.closeSelf()} @cancel=${() => this.closeSelf()}>
				<header>
					<h2>${this.label}</h2>
					<button class="close" @click=${() => this.closeSelf()} aria-label="Close">
						✕
					</button>
				</header>
				${this.error ? html`<div class="error">${this.error}</div> ` : ''}
				${this.loading
					? html`<p>Loading…</p>`
					: rows.length === 0
						? html`<p class="empty">No fields.</p>`
						: html`
								<table>
									<tbody>
										${rows.map((row) => this.renderRow(row))}
									</tbody>
								</table>
							`}
				${kind === 'array'
					? html`<div class="footer">
							<button @click=${() => this.addListItem()}>+ Add item</button>
						</div>`
					: ''}
				${kind === 'map' || (kind === 'any' && !Array.isArray(this.snapshot))
					? html`
							<div class="add-entry">
								<input
									type="text"
									placeholder="New key"
									.value=${this.newEntryKey}
									@input=${(e: Event) =>
										(this.newEntryKey = (e.target as HTMLInputElement).value)}
									@keydown=${(e: KeyboardEvent) => {
										if (e.key === 'Enter') this.addEntry();
									}}
								/>
								<button @click=${() => this.addEntry()}>+ Add entry</button>
							</div>
						`
					: ''}
			</dialog>
			${this.childDialog
				? html`
						<verdant-edit-dialog
							.collection=${this.collection}
							.primaryKey=${this.primaryKey}
							.path=${this.childDialog.path}
							.label=${this.childDialog.label}
							.open=${true}
							@close=${() => this.closeChild()}
						></verdant-edit-dialog>
					`
				: nothing}
		`;
	}

	private renderRow(row: Row) {
		return html`
			<tr>
				<td class="key-cell">${row.label}</td>
				<td>
					${row.key === this.primaryKeyField
						? html`<span class="readonly">${String(row.value)}</span>`
						: row.isContainer
							? html`<button @click=${() => this.openChild(row)}>
									Edit ${summarize(row.value)}
								</button>`
							: html`<verdant-field-input
									.schema=${row.childSchema}
									.value=${row.value}
									@field-save=${(e: CustomEvent<{ value: unknown }>) =>
										this.saveField(row, e.detail.value)}
								></verdant-field-input>`}
				</td>
				<td class="actions-cell">
					${row.deletable && row.key !== this.primaryKeyField
						? html`<button class="delete" @click=${() => this.deleteField(row)}>
								Delete
							</button>`
						: ''}
				</td>
			</tr>
		`;
	}
}

function summarize(value: unknown): string {
	if (Array.isArray(value)) return `(${value.length} items)`;
	if (value && typeof value === 'object')
		return `(${Object.keys(value).length} fields)`;
	return '';
}

declare global {
	interface HTMLElementTagNameMap {
		'verdant-edit-dialog': VerdantEditDialog;
	}
}
