import { Request, Response } from 'express';
import { getLoginSession, setLoginSession } from '../../session.js';
import { prisma } from '@{{todo}}/prisma';

export async function createPlanInviteHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);

  if (!session) {
    return res.status(401).send('Please log in');
  }

  if (!session.planId) {
    return res.status(400).send("You don't have a plan");
  }

  const invite = await prisma.planInvitation.create({
    data: {
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      planId: session.planId,
      inviterName: session.name || 'Someone',
      inviterId: session.userId,
    },
  });

  return res.status(200).json({
    inviteId: invite.id,
    expiresAt: invite.expiresAt,
  });
}

export async function planInviteDetailsHandler(req: Request, res: Response) {
  const inviteId = req.params.inviteId;

  const invite = await prisma.planInvitation.findUnique({
    where: {
      id: inviteId,
    },
  });

  if (!invite) {
    return res.status(404).send('Invite not found');
  }

  return res.status(200).json({
    inviterName: invite.inviterName,
  });
}

export async function claimPlanInviteHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);

  if (!session) {
    return res.status(401).send('Please log in');
  }

  if (session.planId) {
    // TODO: end old plan
    // TODO: cancel stripe subscription
  }

  const inviteId = req.params.inviteId;

  const invite = await prisma.planInvitation.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    return res.status(404).send('Invite not found');
  }

  if (invite.expiresAt < new Date()) {
    return res.status(400).send('Invite expired');
  }

  if (invite.claimedAt) {
    return res.status(400).send('Invite already claimed');
  }

  await prisma.$transaction([
    prisma.plan.update({
      where: { id: invite.planId },
      data: {
        members: {
          connect: {
            id: session.userId,
          },
        },
      },
    }),

    prisma.planInvitation.update({
      where: { id: inviteId },
      data: {
        claimedAt: new Date(),
      },
    }),
  ]);

  setLoginSession(res, {
    ...session,
    planId: invite.planId,
  });

  return res.status(200).json({
    planId: invite.planId,
  });
}
