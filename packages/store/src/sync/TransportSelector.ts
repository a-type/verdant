import type { PresenceManager } from './PresenceManager.js';
import type { SyncTransportMode } from './Sync.js';

export type AutomaticTransportSelection = boolean | 'peers-only';

export class TransportSelector {
	private timeout: ReturnType<typeof setTimeout> | undefined;
	private running = false;
	private socketConnected = false;
	private unsubscribe: (() => void)[];

	constructor(
		private options: {
			selection: AutomaticTransportSelection;
			presence: PresenceManager;
			getMode: () => SyncTransportMode;
			canDoRealtime: () => boolean;
			setMode: (mode: SyncTransportMode) => void;
			realtimeGracePeriod?: number;
		},
	) {
		const gracePeriod = options.realtimeGracePeriod;
		if (
			gracePeriod !== undefined &&
			(!Number.isFinite(gracePeriod) ||
				gracePeriod < 0 ||
				gracePeriod > 2_147_483_647)
		) {
			throw new RangeError(
				'realtimeGracePeriod must be between 0 and 2147483647 milliseconds',
			);
		}
		this.unsubscribe = [
			options.presence.subscribe('peersChanged', this.update),
		];
		if (options.selection !== 'peers-only') {
			this.unsubscribe.push(
				options.presence.subscribe('selfChanged', this.update),
			);
		}
	}

	start() {
		this.running = true;
	}

	stop() {
		this.running = false;
		this.socketConnected = false;
		this.clearTimeout();
	}

	destroy() {
		this.stop();
		this.unsubscribe.forEach((unsubscribe) => unsubscribe());
	}

	socketOnlineChange(online: boolean) {
		if (!this.running) return;
		this.socketConnected = online;
		if (!online) {
			this.clearTimeout();
		} else {
			this.update();
		}
	}

	modeChanged() {
		if (this.options.getMode() !== 'realtime') {
			this.socketConnected = false;
			this.clearTimeout();
		}
	}

	private hasOtherReplicas() {
		const { presence, selection } = this.options;
		return (
			presence.getViewPeers().length > 0 ||
			(selection !== 'peers-only' && presence.selfReplicaIds.size > 1)
		);
	}

	private clearTimeout() {
		if (this.timeout !== undefined) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}
	}

	private update = () => {
		const { selection, getMode, setMode, canDoRealtime, realtimeGracePeriod } =
			this.options;
		if (!this.running || !selection || !canDoRealtime()) return;

		if (this.hasOtherReplicas()) {
			this.clearTimeout();
			if (getMode() === 'pull') setMode('realtime');
		} else if (getMode() === 'realtime') {
			if (!this.socketConnected || this.timeout !== undefined) return;
			this.timeout = setTimeout(() => {
				this.timeout = undefined;
				if (
					this.running &&
					getMode() === 'realtime' &&
					this.socketConnected &&
					!this.hasOtherReplicas()
				) {
					setMode('pull');
				}
			}, realtimeGracePeriod ?? 1000);
		}
	};
}
