import { EventSubscriber } from '@lo-fi/common';

type Undoable = () => Undoable | Promise<Undoable>;

export class UndoHistory extends EventSubscriber<{ change: () => void }> {
	private _undoable: Undoable[] = [];
	private _undone: Undoable[] = [];

	get canUndo() {
		return this._undoable.length > 0;
	}
	get canRedo() {
		return this._undone.length > 0;
	}

	undo = async () => {
		const next = this._undoable.pop();
		if (next) {
			this._undone.push(await next());
			this.emit('change');
			return true;
		}
		return false;
	};

	redo = async () => {
		const next = this._undone.pop();
		if (next) {
			this._undoable.push(await next());
			this.emit('change');
			return true;
		}
		return false;
	};

	addUndo = (undoPoint: Undoable) => {
		this._undoable.push(undoPoint);
		this._undone = [];
		this.emit('change');
	};

	addRedo = (redoPoint: Undoable) => {
		this._undone.push(redoPoint);
		this.emit('change');
	};
}
