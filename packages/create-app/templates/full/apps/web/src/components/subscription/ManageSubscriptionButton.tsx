import { apiHost } from '@/config.js';

export interface ManageSubscriptionButtonProps {
  className?: string;
}

export function ManageSubscriptionButton({
  className,
  ...props
}: ManageSubscriptionButtonProps) {
  return (
    <form
      className={className}
      action={`${apiHost}/api/stripe/create-portal`}
      method="POST"
    >
      <button type="submit" {...props}>
        Change your subscription
      </button>
      <span>Update your card or unsubscribe</span>
    </form>
  );
}
