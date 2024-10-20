import { EventSubscriber, FileData } from '@verdant-web/common';
import { Context } from '../context/context.js';

export type EntityFileEvents = {
	change: () => void;
};

export const UPDATE = Symbol('entity-file-update');
export const MARK_FAILED = Symbol('entity-file-mark-failed');

export type EntityFileSnapshot = {
	id: string;
	url?: string | null;
};

/**
 * Provides a consistent interface for files used in an app via
 * Entity access.
 */
export class EntityFile extends EventSubscriber<EntityFileEvents> {
	// cached object URL for a local blob file, if applicable
	private _objectUrl: string | null = null;
	private _fileData: FileData | null = null;
	private _loading = true;
	private _failed = false;
	private _downloadRemote = false;
	private ctx: Context;
	private unsubscribes: (() => void)[] = [];

	constructor(
		public readonly id: string,
		{
			downloadRemote = false,
			ctx,
		}: {
			downloadRemote?: boolean;
			ctx: Context;
		},
	) {
		super();
		this.ctx = ctx;
		this._downloadRemote = downloadRemote;

		this.unsubscribes.push(
			this.ctx.internalEvents.subscribe(`fileUploaded:${id}`, this.onUploaded),
		);
	}

	get downloadRemote() {
		return this._downloadRemote;
	}
	get isFile() {
		return true;
	}
	get isUploaded() {
		return this._fileData?.remote ?? false;
	}

	[UPDATE] = (fileData: FileData) => {
		this.ctx.log('debug', 'EntityFile updated', this.id, fileData);
		this._loading = false;
		this._failed = false;
		this._fileData = fileData;
		if (fileData.file) {
			if (this._objectUrl) {
				URL.revokeObjectURL(this._objectUrl);
			}
			this.ctx.log('debug', 'Creating object URL for file', this.id);
			this._objectUrl = URL.createObjectURL(fileData.file);
		}
		this.emit('change');
	};

	[MARK_FAILED] = () => {
		this._failed = true;
		this._loading = false;
		this.emit('change');
	};

	private onUploaded = () => {
		if (!this._fileData) return;
		this._fileData!.remote = true;
		this.emit('change');
	};

	get url(): string | null {
		if (this.loading) return null;
		if (this._objectUrl) return this._objectUrl;
		return this._fileData?.url ?? null;
	}

	get name(): string | null {
		return this._fileData?.name ?? null;
	}

	get type(): string | null {
		return this._fileData?.type ?? null;
	}

	get loading() {
		return this._loading;
	}

	get failed() {
		return this._failed;
	}

	destroy = () => {
		if (this._objectUrl) {
			URL.revokeObjectURL(this._objectUrl);
		}
		this.dispose();
	};

	getSnapshot(): FileData {
		return {
			id: this.id,
			url: this._objectUrl ?? this._fileData?.url ?? undefined,
			name: this.name ?? 'unknown-file',
			remote: false,
			type: this.type ?? '',
			file: this._fileData?.file,
		};
	}
}
