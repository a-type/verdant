import {
	HTMLAttributes,
	MouseEvent,
	useCallback,
	useEffect,
	useRef,
} from 'react';
import { useRouteMatchesForPath } from './hooks.js';
import { useIsRouteTransitioning } from './TransitionIndicator.js';

export interface LinkProps
	extends Omit<HTMLAttributes<HTMLAnchorElement>, 'href'> {
	to: string;
	external?: boolean;
	newTab?: boolean;
}

export function Link({
	to,
	onClick,
	external: forceExternal,
	newTab,
	...rest
}: LinkProps) {
	const external = forceExternal ?? isExternal(to);
	const matches = useRouteMatchesForPath(to);
	const transitioning = useIsRouteTransitioning();

	const wasClickedRef = useRef(false);

	// preloading and router stuff isn't useful for external or newTab
	const notRouterCompatible = external || newTab;
	useEffect(() => {
		if (notRouterCompatible) return;

		const cleanups: Array<() => void> = [];
		for (const match of matches) {
			const ret = match.route.onAccessible?.(match.params);
			if (typeof ret === 'function') {
				cleanups.push(ret);
			}
		}
		return () => {
			// skip cleanup if the link was clicked
			if (wasClickedRef.current) {
				wasClickedRef.current = false;
				return;
			}

			for (const cleanup of cleanups) {
				cleanup();
			}
		};
	}, [matches, notRouterCompatible]);

	const handleClick = useCallback(
		function handleClick(event: MouseEvent<HTMLAnchorElement>) {
			event.preventDefault();
			wasClickedRef.current = true;
			window.history.pushState(null, '', to);
			window.dispatchEvent(new PopStateEvent('popstate'));
			onClick?.(event);
		},
		[onClick, matches],
	);

	const pathAtRenderTime =
		typeof window !== 'undefined' ? window.location.pathname : '';

	return (
		<a
			href={to}
			onClick={notRouterCompatible ? onClick : handleClick}
			data-transitioning={pathAtRenderTime === to && transitioning}
			{...rest}
		/>
	);
}

function isExternal(url: string) {
	return /^(\w+):\/\//.test(url);
}
