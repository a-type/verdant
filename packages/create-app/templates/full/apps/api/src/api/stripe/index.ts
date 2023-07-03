import { raw, Router } from 'express';
import { createCheckoutHandler } from './createCheckout.js';
import { createPortalHandler } from './createPortal.js';
import { webhookHandler } from './webhook.js';

const stripeRouter: Router = Router();

stripeRouter.post('/create-checkout', createCheckoutHandler);
stripeRouter.post('/create-portal', createPortalHandler);
stripeRouter.post(
	'/webhook',
	raw({ type: 'application/json' }),
	webhookHandler,
);

export default stripeRouter;
