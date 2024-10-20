export enum VerdantErrorCode {
	InvalidRequest = 4000,
	BodyRequired = 4001,
	NoToken = 4010,
	InvalidToken = 4011,
	TokenExpired = 4012,
	Forbidden = 4030,
	NotFound = 4040,
	Unexpected = 5000,
	ConfigurationError = 5010,
	NoFileStorage = 5011,

	// Client errors

	MigrationPathNotFound = 7001,
	ImportFailed = 7002,
	// some functionality was invoked which requires online status, and
	// client couldn't connect.
	Offline = 7003,
}

export class VerdantError extends Error {
	static Code = VerdantErrorCode;

	constructor(
		public code: VerdantErrorCode,
		cause?: Error | undefined,
		message?: string,
	) {
		super(message ?? `Verdant error: ${code}`, {
			cause,
		});
	}

	get httpStatus() {
		const status = Math.floor(this.code / 10);
		if (status < 600) {
			return status;
		}
		return 500;
	}

	toResponse = () => {
		return JSON.stringify({
			code: this.code,
		});
	};
}

export function isVerdantErrorResponse(body: any): body is { code: number } {
	return (
		typeof body === 'object' && 'code' in body && typeof body.code === 'number'
	);
}
