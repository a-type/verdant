// A: Docs without a base state don't have a baseline, it's
// written upon rebasing. If you apply ops to an undefined
// snapshot without an initialize, it remains undefined.

export type DocumentBaseline<T extends any = any> = {
	oid: string;
	snapshot: T;
	timestamp: string;
	authz?: string;
};
