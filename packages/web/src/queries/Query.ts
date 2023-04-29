import { generateId } from '@lo-fi/common';

export interface BaseQuery<Result> {
	readonly id: string;
	readonly key: string;
	resolved: Promise<Result>;
}

export class Query<Result = any, Params = undefined>
	implements BaseQuery<Result>
{
	readonly id: string;
	resolved: Promise<Result>;
	private resolve!: (value: Result) => void;
	private reject!: (reason: Error) => void;
	private _disposed = false;

	constructor(
		public readonly key: string,
		public readonly collection: string,
		private readonly run: (params: Params) => Promise<Result>,
	) {
		this.id = key + '_' + generateId();
		this.resolved = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	execute = async (params: Params): Promise<Result> => {
		if (this._disposed) {
			throw new Error('Query has been disposed');
		}
		try {
			const value = await this.run(params);
			this.resolve(value);
			return value;
		} catch (error) {
			this.reject(error as Error);
			throw error;
		}
	};

	dispose = () => {
		this._disposed = true;
	};
}
