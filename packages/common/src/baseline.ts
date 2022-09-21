export type DocumentBaseline<T extends any = any> = {
	documentId: string;
	snapshot: T;
	timestamp: string;
};
