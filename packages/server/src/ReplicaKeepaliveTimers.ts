import { EventSubscriber } from '@verdant-web/common';

/**
 * A set of timers per-replica which are
 * refreshed whenever the replica sends
 * a message to the server. If a timer expires,
 * the replica is removed from presence. This
 * is a failsafe for socket-based replicas but
 * essential for pull-based replicas.
 */
export class ReplicaKeepaliveTimers extends EventSubscriber<{
	lost: (libraryId: string, replicaId: string) => void;
}> {
	private timers = new Map<string, NodeJS.Timeout>();

	constructor(private timeout = 30 * 1000) {
		super();
	}

	refresh = (libraryId: string, replicaId: string) => {
		const existing = this.timers.get(replicaId);
		if (existing) {
			clearTimeout(existing);
		}

		this.timers.set(
			replicaId,
			setTimeout(() => {
				this.emit('lost', libraryId, replicaId);
				this.timers.delete(replicaId);
			}, this.timeout),
		);
	};
}
