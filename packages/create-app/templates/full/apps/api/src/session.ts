import { IncomingMessage } from 'http';
import { MAX_AGE, setTokenCookie, getTokenCookie } from './cookies.js';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { sessionSecret } from './config.js';

export interface Session {
	userId: string;
	name: string | null;
	planId: string;
	role: 'admin' | 'user';
}

export async function setLoginSession(res: Response, session: Session) {
	// create a session object with a max age we can validate later
	const sessionObject = {
		sub: session.userId,
		iat: Date.now(),
		pid: session.planId,
		nam: session.name,
		role: session.role,
	};
	const token = jwt.sign(sessionObject, sessionSecret, {
		expiresIn: MAX_AGE,
	});

	setTokenCookie(res, token);
}

export async function getLoginSession(
	req: IncomingMessage,
): Promise<Session | null> {
	const token = getTokenCookie(req);

	if (!token) return null;

	const data = jwt.verify(token, sessionSecret) as {
		sub: string;
		iat: number;
		pid: string;
		nam: string | null;
		role: 'admin' | 'user';
		pad: boolean;
	};

	return {
		userId: data.sub,
		planId: data.pid,
		name: data.nam,
		role: data.role,
	};
}

export async function authenticatedProfile(req: IncomingMessage) {
	try {
		const session = await getLoginSession(req);

		if (!session) {
			return null;
		}

		return session;
	} catch (e) {
		return null;
	}
}
