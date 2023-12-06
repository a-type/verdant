/**
 * This is a messaging / eventing system which lets the system retrieve objects
 * without storing references to those objects, so that they can be garbage
 * collected when they are no longer needed.
 *
 * The system sends out a call to a particular object and if the object
 * responds, it is returned. If the object does not respond, it is assumed to
 * have been garbage collected and is removed from the registry.
 */
export class Registry<T extends object> {
	private responders: Map<string, () => void> = new Map();
	private announced: Map<string, T> = new Map();

	register = (id: string, responder: () => void) => {
		if (this.responders.has(id)) {
			// this will indicate a problem in the system -- we shouldn't create
			// more than one item for each id
			throw new Error(`Item ${id} already registered`);
		}
		this.responders.set(id, responder);
	};

	find = (id: string): T | null => {
		const responder = this.responders.get(id);
		if (responder) {
			responder();
			const item = this.announced.get(id);
			if (item) {
				this.announced.delete(id);
				return item;
			}
		}
		return null;
	};

	announce = (id: string, item: T | undefined) => {
		if (item) {
			this.announced.set(id, item);
		}
	};
}
