type Undoable = () => Undoable | Promise<Undoable>;

export class UndoHistory {
	private _undoable: Undoable[] = [];
	private _undone: Undoable[] = [];

	undo = async () => {
		const next = this._undoable.pop();
		if (next) {
			this._undone.push(await next());
			return true;
		}
		return false;
	};

	redo = async () => {
		const next = this._undone.pop();
		if (next) {
			this._undoable.push(await next());
			return true;
		}
		return false;
	};

	addUndo = (undoPoint: Undoable) => {
		this._undoable.push(undoPoint);
		this._undone = [];
	};

	addRedo = (redoPoint: Undoable) => {
		this._undone.push(redoPoint);
	};
}
