import { EventSubscriber, FileData } from '@verdant-web/common';

export type EntityFileEvents = {
	change: () => void;
};

export const UPDATE = Symbol('entity-file-update');
export const MARK_FAILED = Symbol('entity-file-mark-failed');

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
	private _disposed = false;
	private _downloadRemote = false;

	constructor(
		public readonly id: string,
		{
			downloadRemote = false,
		}: {
			downloadRemote?: boolean;
		} = {},
	) {
		super();
		this._downloadRemote = downloadRemote;
	}

	get downloadRemote() {
		return this._downloadRemote;
	}

	[UPDATE] = (fileData: FileData) => {
		this._loading = false;
		this._failed = false;
		this._disposed = false;
		this._fileData = fileData;
		if (fileData.file) {
			if (this._objectUrl) {
				URL.revokeObjectURL(this._objectUrl);
			}
			this._objectUrl = URL.createObjectURL(fileData.file);
		}
		this.emit('change');
	};

	[MARK_FAILED] = () => {
		this._failed = true;
		this._loading = false;
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

	dispose = () => {
		if (this._objectUrl) {
			URL.revokeObjectURL(this._objectUrl);
		}
		this._disposed = true;
	};
}
