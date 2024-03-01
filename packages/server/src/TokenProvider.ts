import { ReplicaType } from '@verdant-web/common';
import jwt from 'jsonwebtoken';

export class TokenProvider {
	constructor(private config: { secret: string }) {}

	getToken = ({
		userId,
		libraryId,
		syncEndpoint,
		role,
		type = ReplicaType.Realtime,
		expiresIn = '1d',
		fileEndpoint,
	}: {
		userId: string;
		libraryId: string;
		syncEndpoint: string;
		fileEndpoint?: string;
		role?: string;
		type?: ReplicaType;
		/**
		 * The time when the token will expire. A string in the format of "3d" or a number of seconds.
		 */
		expiresIn?: string | number;
	}) => {
		return jwt.sign(
			{
				sub: userId,
				lib: libraryId,
				url: syncEndpoint,
				file: fileEndpoint,
				role,
				type,
			},
			this.config.secret,
			{
				expiresIn,
			},
		);
	};
}
