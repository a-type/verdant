import { Request, Response } from 'express';
import { getLoginSession, setLoginSession } from '../../session.js';
import { prisma } from '@{{todo}}/prisma';

export async function createPlanHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);

  if (!session) {
    return res.status(401).send('Please log in');
  }

  if (session.planId) {
    return res.status(400).send('You already have a plan');
  }

  const plan = await prisma.plan.create({
    data: {
      members: {
        connect: {
          id: session.userId,
        },
      },
    },
  });

  await setLoginSession(res, {
    ...session,
    planId: plan.id,
  });

  return res.status(200).json({
    planId: plan.id,
  });
}
