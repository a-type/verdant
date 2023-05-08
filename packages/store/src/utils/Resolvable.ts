export class Resolvable<T> {
	readonly promise: Promise<T>;
	private _resolve: (value: T) => void;
	private _reject: (reason?: any) => void;

	constructor() {
		let resolve: (value: T) => void;
		let reject: (reason?: any) => void;
		this.promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		this._resolve = resolve!;
		this._reject = reject!;
	}

	resolve(value: T) {
		this._resolve(value);
	}

	reject(reason?: any) {
		this._reject(reason);
	}
}
