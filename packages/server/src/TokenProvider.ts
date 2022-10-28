import jwt from 'jsonwebtoken';

export class TokenProvider {
	constructor(private config: { secret: string }) {}

	getToken = ({ userId, libraryId }: { userId: string; libraryId: string }) => {
		return jwt.sign(
			{
				sub: userId,
				lib: libraryId,
			},
			this.config.secret,
		);
	};
}
