export class Disposable {
	private _disposes: (() => void | Promise<void>)[] = [];
	protected disposed = false;

	dispose = async () => {
		this.disposed = true;
		await Promise.all(
			this._disposes.map(async (dispose) => {
				try {
					await dispose();
				} catch (err) {
					console.error('Error disposing', err);
				}
			}),
		);
		this._disposes = [];
	};

	compose = (disposable: { dispose: () => void | Promise<void> }) =>
		this.addDispose(disposable.dispose.bind(disposable));

	protected addDispose = (dispose: () => void | Promise<void>) => {
		this._disposes.push(dispose);
	};
}
