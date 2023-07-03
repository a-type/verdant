import { Request, Response } from 'express';
import { prisma } from '@{{todo}}/prisma';
import { stripe } from '../../lib/stripe.js';
import Stripe from 'stripe';
import { stripeWebhookSecret } from '../../config.js';

export async function webhookHandler(req: Request, res: Response) {
  let event = req.body;

  const signature = req.headers['stripe-signature']!;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      stripeWebhookSecret,
    );
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err);
    return res.sendStatus(400);
  }

  let subscription;
  let status;
  let planId;

  try {
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        subscription = event.data.object as Stripe.Subscription;
        status = subscription.status;
        planId = subscription.metadata.planId;
        if (!planId) {
          console.error('No planId found on subscription ' + subscription.id);
          break;
        }
        await prisma.plan.update({
          where: { id: planId },
          data: { subscriptionStatus: status },
        });
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object as Stripe.Subscription;
        status = subscription.status;
        planId = subscription.metadata.planId;
        if (!planId) {
          console.error('No planId found on subscription ' + subscription.id);
          break;
        }
        await prisma.plan.update({
          where: { id: planId },
          data: {
            subscriptionStatus: status,
            subscriptionCanceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
          },
        });
        break;
      case 'customer.subscription.created':
        subscription = event.data.object as Stripe.Subscription;
        status = subscription.status;
        planId = subscription.metadata.planId;
        if (!planId) {
          console.error('No planId found on subscription ' + subscription.id);
          break;
        }
        await prisma.plan.update({
          where: { id: planId },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
          },
        });
        break;
      case 'customer.subscription.updated':
        subscription = event.data.object as Stripe.Subscription;
        status = subscription.status;
        planId = subscription.metadata.planId;
        if (!planId) {
          console.error('No planId found on subscription ' + subscription.id);
          break;
        }
        await prisma.plan.update({
          where: { id: planId },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
            subscriptionCanceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
            subscriptionExpiresAt:
              subscription.status !== 'active' &&
              subscription.status !== 'trialing'
                ? new Date(subscription.current_period_end * 1000)
                : null,
            stripeCustomerId: subscription.customer as string,
          },
        });
        break;
    }
  } catch (err) {
    console.error('!!! Stripe webhook error');
    console.error(err);
    res.status(500).send('Error processing webhook');
  }

  res.sendStatus(200);
}
