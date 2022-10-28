import jwt from 'jsonwebtoken';

export class TokenVerifier {
	constructor(private config: { secret: string }) {}

	verifyToken = (token: string) => {
		const decoded = jwt.verify(token, this.config.secret) as {
			sub: string;
			lib: string;
		};
		return {
			userId: decoded.sub,
			libraryId: decoded.lib,
		};
	};
}
