import { Request, Response } from 'express';
import { getLoginSession, setLoginSession } from '../../session.js';
import { getSubscriptionStatusError } from '../../auth/subscriptions.js';
import { removeTokenCookie } from '../../cookies.js';

export default async function sessionHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);
  if (!session) {
    return res.status(401).send({
      error: 'Please log in',
    });
  }

  const planStatusError = await getSubscriptionStatusError(session);

  if (
    planStatusError === 'No account found' ||
    planStatusError === 'Plan changed'
  ) {
    // our session is invalid, so we need to log the user out
    removeTokenCookie(res);
    return res.status(401).send({
      error: planStatusError,
    });
  }

  // refresh session
  await setLoginSession(res, session);

  res
    .status(200)
    .json({
      session,
      isSubscribed: !planStatusError,
      planStatus: planStatusError || 'Subscribed',
    });
}
