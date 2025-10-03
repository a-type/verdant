import { EventSubscriber, FileData } from '@verdant-web/common';
import { Context } from '../context/context.js';
import { Entity } from '../entities/Entity.js';

export type EntityFileEvents = {
	change: () => void;
};

export const UPDATE = Symbol('entity-file-update');
export const MARK_FAILED = Symbol('entity-file-mark-failed');

// this one goes on Entity
export const CHILD_FILE_CHANGED = Symbol('child-file-changed');

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
	private _failedReason: string | undefined;
	private _downloadRemote = false;
	private _uploaded = false;
	private ctx: Context;
	private unsubscribes: (() => void)[] = [];
	private parent: Entity;

	constructor(
		public readonly id: string,
		{
			downloadRemote = false,
			ctx,
			parent,
		}: {
			downloadRemote?: boolean;
			ctx: Context;
			parent: Entity;
		},
	) {
		super();
		this.ctx = ctx;
		this.parent = parent;
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
		return this._uploaded || this._fileData?.remote || false;
	}
	get error() {
		return this._failedReason || null;
	}

	private emitChange() {
		this.parent[CHILD_FILE_CHANGED](this);
		this.emit('change');
	}

	[UPDATE] = (fileData: FileData) => {
		this.ctx.log('debug', 'EntityFile updated', this.id, fileData);
		this._loading = false;
		this._failed = false;
		this._fileData = fileData;
		if (fileData.file) {
			if (this._objectUrl && 'revokeObjectURL' in URL) {
				URL.revokeObjectURL(this._objectUrl);
			}
			this.ctx.log('debug', 'Creating object URL for file', this.id);
			this._objectUrl = URL.createObjectURL(fileData.file);
		}
		this.emitChange();
	};

	[MARK_FAILED] = (reason?: string) => {
		this._failed = true;
		this._failedReason = reason;
		this._loading = false;
		this.emitChange();
	};

	private onUploaded = (data: FileData) => {
		// TODO: cleanup all this uploaded flagging junk
		this._fileData ??= data;
		this._uploaded = true;
		this.ctx.log('debug', 'File marked uploaded', this.id, this._fileData);
		this.emitChange();
	};

	get url(): string | null {
		// prefer local file representations.
		if (this.loading) return null;
		if (this._objectUrl) return this._objectUrl;
		// TODO: use localPath here?
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
			remote: this._fileData?.remote ?? false,
			type: this.type ?? '',
			file: this._fileData?.file,
		};
	}
}
