import {
	EventSubscriber,
	FileData,
	FileRef,
	ObjectIdentifier,
	PropertyName,
} from '@verdant-web/common';
import { Context } from '../context/context.js';

export type EntityFileEvents = {
	change: () => void;
};

export const UPDATE = Symbol('entity-file-update');
export const MARK_FAILED = Symbol('entity-file-mark-failed');

export interface EntityFileContext {
	readonly oid: ObjectIdentifier;
	readonly key: PropertyName;
	getFileRef(): FileRef | null;
	applyFileRef(file: FileRef): void;
	subscribe(callback: () => void): () => void;
	onChange(): void;
}

export type EntityFileSnapshot = {
	id: string;
	url?: string | null;
	name: string;
	remote: boolean;
	type: string;
	file?: Blob | null;
	alt: string | null;
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
	private _alt: string | null = null;
	private ctx: Context;
	private unsubscribes: (() => void)[] = [];
	private fileContext: EntityFileContext;

	constructor(
		public readonly id: string,
		{
			downloadRemote = false,
			ctx,
			fileContext,
		}: {
			downloadRemote?: boolean;
			ctx: Context;
			fileContext: EntityFileContext;
		},
	) {
		super();
		this.ctx = ctx;
		this.fileContext = fileContext;
		this._downloadRemote = downloadRemote;
		this._alt = fileContext.getFileRef()?.alt ?? null;
		this.unsubscribes.push(fileContext.subscribe(this.onContextChange));

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
	get alt() {
		return this._alt;
	}

	setAlt = (alt: string | null) => {
		const file = this.fileContext.getFileRef();
		if (!file || file.id !== this.id) {
			throw new Error(
				'Cannot set alt text on a file which is no longer present',
			);
		}
		if ((file.alt ?? null) === alt) return;
		this.fileContext.applyFileRef({ ...file, alt });
	};

	private onContextChange = () => {
		const nextAlt = this.fileContext.getFileRef()?.alt ?? null;
		if (nextAlt !== this._alt) {
			this._alt = nextAlt;
			this.emitChange();
		}
	};

	private emitChange() {
		this.fileContext.onChange();
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

	getSnapshot(): EntityFileSnapshot {
		return {
			id: this.id,
			url: this._fileData?.url ?? this._objectUrl ?? undefined,
			name: this.name ?? 'unknown-file',
			remote: this._fileData?.remote ?? false,
			type: this.type ?? '',
			file: this._fileData?.file,
			alt: this.alt,
		};
	}
}
