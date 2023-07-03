import { Request, Response } from 'express';
import { getLoginSession } from '../../session.js';
import { uiHost } from '../../config.js';
import { prisma } from '@{{todo}}/prisma';
import { stripe } from '../../lib/stripe.js';

export async function createPortalHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);
  if (!session) {
    return res.status(401).send('Please log in');
  }

  const plan = await prisma.plan.findUnique({
    where: { id: session.planId },
  });

  if (!plan) {
    return res.status(400).send('You do not have a plan');
  }

  if (!plan.stripeCustomerId) {
    return res.status(400).send('No subscription');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: plan.stripeCustomerId,
    return_url: uiHost,
  });

  return res.redirect(portalSession.url);
}
