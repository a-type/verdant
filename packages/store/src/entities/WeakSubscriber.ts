export class WeakSubscriber<Params extends any[]> {
	private handlers: Map<string, WeakRef<(...params: Params) => void>> =
		new Map();

	subscribe(id: string, handler: (...params: Params) => void) {
		this.handlers.set(id, new WeakRef(handler));
	}

	unsubscribe(id: string) {
		this.handlers.delete(id);
	}

	emit(id: string, ...params: Params) {
		const handler = this.handlers.get(id)?.deref();
		if (handler) {
			handler(...params);
		} else {
			this.handlers.delete(id);
		}
	}
}
