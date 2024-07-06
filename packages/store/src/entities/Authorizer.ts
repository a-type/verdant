import { authz as coreAuthz, ORIGINATOR_SUBJECT } from '@verdant-web/common';
import { Context } from '../context.js';
import { Metadata } from '../metadata/Metadata.js';
import { Sync } from '../sync/Sync.js';

export class Authorizer {
	constructor(
		private ctx: Context,
		private meta: Metadata,
		private sync: Sync,
	) {
		// subscribe to presence changes to keep track of our own user ID
		this.sync.presence.subscribe('selfChanged', async (presence) => {
			const userId = await this.getUserId();
			if (userId !== presence.id) {
				await this.meta.localReplica.update({
					userId,
				});
			}
		});
	}

	private getUserId = async () => {
		const self = this.sync.presence.self;
		if (self.id) {
			return self.id;
		}
		const localReplica = await this.meta.localReplica.get();
		if (localReplica.userId) {
			return localReplica.userId;
		}

		// if no user ID is available, authorization subject is
		// the 'originator' - i.e. we're in a local-only scenario
		// haven't been assigned any profile ID, and any changes
		// eventually synced to a server should be interpreted
		// as owned by whatever profile ID is eventually assigned to
		// this replica.
		return ORIGINATOR_SUBJECT;
	};

	public = () => undefined;

	private = async () => {
		const userId = await this.getUserId();
		return coreAuthz.onlyUser(userId);
	};
}
