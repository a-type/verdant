import { HTMLAttributes, MouseEvent, useCallback, useEffect } from 'react';
import { useRouteMatchesForPath } from './hooks.js';

export interface LinkProps
	extends Omit<HTMLAttributes<HTMLAnchorElement>, 'href'> {
	to: string;
}

export function Link({ to, onClick, ...rest }: LinkProps) {
	const matches = useRouteMatchesForPath(to);

	useEffect(() => {
		for (const match of matches) {
			match.route.onAccessible?.(match.params);
		}
	}, [matches]);

	const handleClick = useCallback(
		function handleClick(event: MouseEvent<HTMLAnchorElement>) {
			event.preventDefault();
			window.history.pushState(null, '', to);
			window.dispatchEvent(new PopStateEvent('popstate'));
			onClick?.(event);
			for (const match of matches) {
				match.route.onVisited?.(match.params);
			}
		},
		[onClick, matches],
	);

	return <a href={to} onClick={handleClick} {...rest} />;
}
