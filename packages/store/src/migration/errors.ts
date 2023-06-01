export class MigrationPathError extends Error {
	readonly name = 'MigrationPathError';

	constructor(public readonly message: string) {
		super(message);
	}
}
