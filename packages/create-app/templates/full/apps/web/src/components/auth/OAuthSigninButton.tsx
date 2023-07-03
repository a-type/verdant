import { apiHost } from '@/config.js';
import { ReactNode } from 'react';

export function OAuthSignInButton({
	provider,
	returnTo,
	children,
	className,
	inviteId,
	...rest
}: {
	provider: string;
	returnTo?: string | null;
	children?: ReactNode;
	inviteId?: string | null;
  className?: string;
}) {
	const url = new URL(
		`${apiHost}/api/auth/${provider}/login`,
	);
	if (returnTo) {
		url.searchParams.set('returnTo', returnTo);
	}
	if (inviteId) {
		url.searchParams.set('inviteId', inviteId);
	}

	return (
		<form action={url.toString()} className={className} method="post">
			<button type="submit" {...rest}>
				{children}
			</button>
		</form>
	);
}
