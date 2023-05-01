export class Disposable {
	private _disposes: (() => void)[] = [];
	protected disposed = false;

	dispose = () => {
		this.disposed = true;
		this._disposes.forEach((dispose) => dispose());
		this._disposes = [];
	};

	protected addDispose = (dispose: () => void) => {
		this._disposes.push(dispose);
	};
}
