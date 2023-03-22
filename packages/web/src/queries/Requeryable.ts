import { Resolvable } from '../utils/Resolvable.js';

export class Requeryable<T, RunParams> {
	private runImpl;
	private apply;
	private _resolvable;

	private _result;

	get result() {
		return this._result;
	}

	get resolved() {
		return this._resolvable.promise;
	}

	constructor({
		run,
		initialResult,
		apply,
	}: {
		run: (params: RunParams) => Promise<T>;
		apply?: (result: T, previous: T) => T;
		initialResult: T;
	}) {
		this.runImpl = run;
		this.apply = apply || ((res) => res);
		this._result = initialResult;
		this._resolvable = new Resolvable<T>();
	}

	run = async (params: RunParams) => {
		this._result = this.apply(await this.runImpl(params), this._result);
		this._resolvable.resolve(this._result);
	};
}
