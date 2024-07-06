export interface UserInfo<Profile, Presence> {
	/**
	 * This is the ID representing the user who is utilizing a
	 * replica client to connect to the storage network.
	 * One user may have multiple replica clients active at once,
	 * but their presence will only reflect the most recent
	 * replica used.
	 */
	id: string;
	/**
	 * This is the ID representing the replica client that is
	 * connected to the storage network. This is used to
	 * identify the client when sending messages to it.
	 */
	replicaId: string;

	/**
	 * This is the user's server profile. This data is associated
	 * with the logged in user of the app and cannot be modified
	 * by the local replica directly.
	 */
	profile: Profile;

	/**
	 * Presence info which can update frequently as a replica
	 * makes changes. The shape of presence is up to you.
	 */
	presence: Presence;
}
