export enum VerdantErrorCode {
	MigrationPathNotFound = 50001,
}

export class VerdantError extends Error {
	static Code = VerdantErrorCode;
	constructor(
		public code: VerdantErrorCode,
		message: string,
	) {
		super(message);
	}
}
