/**
 * A version of Promise<T> that can be resolved manually.
 */
export class Resolvable<T> {
	promise: Promise<T>;
	resolve;
	reject;

	constructor() {
		let resolve: (value: T) => void;
		let reject: (error: any) => void;
		this.promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		this.resolve = resolve!;
		this.reject = reject!;
	}
}
