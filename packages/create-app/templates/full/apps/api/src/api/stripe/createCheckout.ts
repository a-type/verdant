import { Request, Response } from 'express';
import { getLoginSession } from '../../session.js';
import { stripe } from '../../lib/stripe.js';
import { uiHost } from '../../config.js';

export async function createCheckoutHandler(req: Request, res: Response) {
  const session = await getLoginSession(req);

  if (!session) {
    return res.status(401).send('Please log in');
  }

  /**
   * TODO: you might want to specify a price here
   * to be sure it's the right product.
   */
  const prices = await stripe.prices.list({
    expand: ['data.product'],
  });

  const price = prices.data[0];

  if (!price) {
    return res.status(400).send('No prices');
  }

  const checkout = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${uiHost}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${uiHost}?nevermind`,
    subscription_data: {
      metadata: {
        planId: session.planId,
      },
      // Add a trial period if you want!
      // trial_period_days: 14,
    },
  });

  if (!checkout.url) {
    return res.status(500).send('Error creating checkout session');
  }

  return res.redirect(checkout.url);
}
