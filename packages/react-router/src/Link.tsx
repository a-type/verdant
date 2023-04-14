import { HTMLAttributes, MouseEvent, useCallback } from 'react';

export interface LinkProps
	extends Omit<HTMLAttributes<HTMLAnchorElement>, 'href'> {
	to: string;
}

export function Link({ to, onClick, ...rest }: LinkProps) {
	const handleClick = useCallback(
		function handleClick(event: MouseEvent<HTMLAnchorElement>) {
			event.preventDefault();
			window.history.pushState(null, '', to);
			window.dispatchEvent(new PopStateEvent('popstate'));
			onClick?.(event);
		},
		[onClick],
	);

	return <a href={to} onClick={handleClick} {...rest} />;
}
