export type DocumentBaseline<T extends any = any> = {
	oid: string;
	snapshot: T;
	timestamp: string;
	// TODO: is a deleted flag required here? can we disambiguate
	// a document which was snapshotted in a deleted state, vs
	// one without a base state at all? what happens if you apply
	// ops onto an undefined snapshot (which aren't initialize)?
};
