import Stripe from 'stripe';
import { stripeSecretKey } from '../config.js';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-08-01',
});
