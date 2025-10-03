import { assert, ReplicaType, VerdantError } from '@verdant-web/common';
import jwt, { JwtPayload } from 'jsonwebtoken';

export class TokenVerifier {
	constructor(private config: { secret: string }) {}

	get secret() {
		return this.config.secret;
	}

	verifyToken = (token: string): TokenInfo => {
		try {
			const decoded = jwt.verify(token, this.config.secret, {
				complete: false,
			}) as JwtPayload;
			assert(decoded.sub);
			return {
				userId: decoded.sub,
				libraryId: decoded.lib,
				syncEndpoint: decoded.url,
				role: decoded.role,
				type: decoded.type,
				token,
			};
		} catch (e) {
			if (e instanceof jwt.TokenExpiredError) {
				throw new VerdantError(VerdantError.Code.TokenExpired);
			}
			if (e instanceof Error) {
				throw new VerdantError(VerdantError.Code.Unexpected, e);
			}
			throw new VerdantError(
				VerdantError.Code.Unexpected,
				undefined,
				JSON.stringify(e),
			);
		}
	};
}

export interface TokenInfo {
	userId: string;
	libraryId: string;
	syncEndpoint: string;
	role?: string;
	type: ReplicaType;
	token: string;
}
