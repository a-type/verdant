import { prisma } from '@{{todo}}/prisma';
import { Session } from '../session.js';
import Stripe from 'stripe';

export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export async function verifySubscription(session: Session) {
  const status = await getSubscriptionStatusError(session);
  if (status) {
    throw new SubscriptionError(status);
  }
}

/**
 * WARNING: mutates session
 */
export async function getSubscriptionStatusError(session: Session) {
  const profileAndPlan = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      plan: true,
    },
  });

  if (!profileAndPlan) {
    return 'No account found';
  }

  const plan = profileAndPlan.plan;

  if (plan.id !== session.planId) {
    // the user's plan has changed, so we need to refresh the session
    return 'Plan changed';
  }

  if (!plan) {
    return 'No plan found';
  }
  if (!plan.stripeSubscriptionId) {
    return 'No subscription found';
  }
  if (
    !plan.subscriptionStatus ||
    rejectedSubscriptionStatuses.includes(
      plan.subscriptionStatus as Stripe.Subscription.Status,
    )
  ) {
    return 'No subscription found';
  }

  // no error? update session
  session.role = profileAndPlan.role as 'admin' | 'user';
  session.planId = plan.id;
  session.name = profileAndPlan.friendlyName;
}

const rejectedSubscriptionStatuses: Stripe.Subscription.Status[] = [
  'canceled',
  'past_due',
  'unpaid',
  'incomplete_expired',
];
