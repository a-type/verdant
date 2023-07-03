import { apiHost } from '@/config.js';
import { useSession } from '@/hooks/useSession.js';

export interface CompleteSubscriptionProps {}

/**
 * Renders a button to complete subscription signup
 * after a user signs up for an account
 */
export function CompleteSubscription({}: CompleteSubscriptionProps) {
  const { data, isLoading } = useSession();

  // only show if the user has signed up for an account
  // but has not yet subscribed
  const show = !isLoading && data?.session && data?.isSubscribed === false;

  if (!show) return null;

  return (
    <form action={`${apiHost}/api/stripe/create-checkout`} method="POST">
      <button type="submit">Complete your subscription</button>
      <span>
        Cancel anytime. Your list will still be on this device forever.
      </span>
    </form>
  );
}
