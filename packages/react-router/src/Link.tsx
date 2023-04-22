import {
	HTMLAttributes,
	MouseEvent,
	forwardRef,
	useCallback,
	useEffect,
	useRef,
} from 'react';
import { useNavigate, useRouteMatchesForPath } from './hooks.js';
import { useIsRouteTransitioning } from './TransitionIndicator.js';

export interface LinkProps
	extends Omit<HTMLAttributes<HTMLAnchorElement>, 'href'> {
	to: string;
	external?: boolean;
	newTab?: boolean;
	replace?: boolean;
	skipTransition?: boolean;
	state?: any;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
	{
		to: rawTo,
		onClick,
		external: forceExternal,
		newTab,
		replace,
		skipTransition = false,
		state,
		...rest
	},
	ref,
) {
	const to = resolve(rawTo);
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

	const navigate = useNavigate();
	const handleClick = useCallback(
		function handleClick(event: MouseEvent<HTMLAnchorElement>) {
			event.preventDefault();
			wasClickedRef.current = true;
			navigate(to, {
				replace,
				skipTransition,
				state,
			});
			onClick?.(event);
		},
		[onClick, matches, replace, state],
	);

	const pathAtRenderTime =
		typeof window !== 'undefined' ? window.location.pathname : '';

	const newTabProps = newTab
		? {
				target: '_blank',
				rel: 'noopener noreferrer',
		  }
		: {};

	return (
		<a
			ref={ref}
			href={to}
			onClick={notRouterCompatible ? onClick : handleClick}
			data-transitioning={pathAtRenderTime === to && transitioning}
			{...newTabProps}
			{...rest}
		/>
	);
});

function isExternal(url: string = '') {
	return /^(\w+):\/\//.test(url);
}

function resolve(path: string = '') {
	if (path.startsWith('.')) {
		return new URL(path, window.location.href).pathname;
	}
	return path;
}
