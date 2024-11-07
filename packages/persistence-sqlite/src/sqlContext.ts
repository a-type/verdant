export interface SqlContext {
	migrationLock?: Promise<void>;
}
