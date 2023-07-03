import { Request, Response } from 'express';
import { getLoginSession } from '../../session.js';
import { verdantSecret, serverHost } from '../../config.js';
import { ReplicaType, TokenProvider } from '@verdant-web/server';
import { verifySubscription } from '../../auth/subscriptions.js';

const tokenProvider = new TokenProvider({
	secret: verdantSecret,
});

export default async function verdantAuthHandler(req: Request, res: Response) {
	const session = await getLoginSession(req);
	if (!session) {
		return res.status(401).send('Please log in');
	}

	try {
		await verifySubscription(session);

		const token = tokenProvider.getToken({
			userId: session.userId,
			libraryId: session.planId,
			syncEndpoint: `${serverHost}/lo-fi`,
			type: ReplicaType.Realtime,
		});

		res.status(200).json({ accessToken: token });
	} catch (e) {
		res.status(402).send('Please upgrade your subscription');
	}
}
