import { EventSubscriber } from '@verdant-web/common';

type Undoable = () => Undoable | Promise<Undoable | null> | null;

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
			const redo = await next();
			if (redo) this._undone.push(redo);
			this.emit('change');
			return true;
		}
		return false;
	};

	redo = async () => {
		const next = this._undone.pop();
		if (next) {
			const undo = await next();
			if (undo) this._undoable.push(undo);
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

	clear = () => {
		this._undoable = [];
		this._undone = [];
		this.emit('change');
	};
}
