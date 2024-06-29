import {
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	RouteLevelContext,
	useEvents,
	useLocationPath,
	useRootMatch,
} from './context.js';
import { WillNavigateEvent } from './events.js';
import {
	getAllMatchingRoutes,
	getBestRouteMatch,
	matchPath,
} from './resolution.js';
import { getScrollPosition, recordScrollPosition } from './scrollPositions.js';
import { RouteConfig, RouteMatch } from './types.js';
import { generateId } from './util.js';
import { useIsRouteTransitioning } from './TransitionIndicator.js';

function useStableCallback<T extends Function>(cb: T): T {
	const ref = useRef(cb);
	ref.current = cb;
	return useCallback((...args: any[]) => ref.current(...args), []) as any as T;
}

export type RouteState = {
	state?: any;
	skipTransition?: boolean;
	id: string;
	isSearch?: boolean;
};

export type PreviousLocation = {
	pathname: string;
	search: string;
	hash: string;
};

/**
 * Calls the given callback when the location changes.
 */
export function useOnLocationChange(
	callback: (
		location: Location,
		state: RouteState,
		prev: PreviousLocation,
	) => void,
) {
	const cb = useStableCallback(callback);
	const previousRef = useRef<PreviousLocation>({
		pathname: location.pathname,
		search: location.search,
		hash: location.hash,
	});

	useLayoutEffect(() => {
		const handler = (ev: PopStateEvent) => {
			cb(
				location,
				ev.state || {
					id: 'initial',
				},
				previousRef.current,
			);
			previousRef.current = {
				pathname: location.pathname,
				search: location.search,
				hash: location.hash,
			};
		};
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, [cb]);
}

const EMPTY_ROUTES: RouteConfig[] = [];

/**
 * Returns the best matching route for the given path from the
 * list of supplied routes.
 */
export function useMatchingRouteForPath(
	path: string,
	routes: RouteConfig[] | null,
) {
	const match = useMemo(
		() => getBestRouteMatch(path, routes || EMPTY_ROUTES),
		[routes, path],
	);

	return match;
}

/**
 * Returns the full list of matching routes for the given path.
 * A path will match exactly one leaf route; this is the traversal
 * from the root to that leaf.
 *
 * The path can be relative to the current location or absolute.
 */
export function useRouteMatchesForPath(fullPath: string): RouteMatch[] {
	const root = useRootMatch();
	const matches = useMemo(
		() => getAllMatchingRoutes(fullPath, root?.route.children || []),
		[root, fullPath],
	);
	return matches;
}

export function useMatchingRoutes(): RouteMatch[] {
	const fullPath = useLocationPath();
	return useRouteMatchesForPath(fullPath);
}

/**
 * Returns the matched path params for the current route.
 */
export function useParams<Shape extends Record<string, string>>(): Shape {
	const matches = useMatchingRoutes();
	return useMemo(() => {
		return matches.reduce(
			(params, match) => {
				Object.assign(params, match.params);
				return params;
			},
			{} as any as Shape,
		);
	}, [matches]);
}

/**
 * Returns the current level's matching route.
 */
export function useMatchingRoute(): RouteMatch | null {
	const { match } = useContext(RouteLevelContext);
	return match;
}

/**
 * Returns the next matching route for the current level (the
 * child of the current route that matches the current path, if any).
 */
export function useNextMatchingRoute(): RouteMatch | null {
	const { match: parent, params } = useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		parent?.remainingPath ?? '',
		parent?.route.children ?? null,
	);

	// params must be merged in manually for this hook...
	const matchWithParams = useMemo(
		() => ({
			...match,
			params: {
				...params,
				...match?.params,
			},
		}),
		[match, params],
	);

	if (!match) {
		return null;
	}

	// cast here relies on match being defined
	return matchWithParams as RouteMatch;
}

/**
 * Provides a method you can call to navigate to a new path, with
 * state and options to skip React transitions.
 */
export function useNavigate() {
	const events = useEvents();

	return useCallback(
		(
			to: string,
			{
				replace,
				skipTransition,
				state = null,
				preserveScroll,
				preserveQuery,
			}: {
				replace?: boolean;
				skipTransition?: boolean;
				state?: any;
				preserveScroll?: boolean;
				preserveQuery?: boolean;
			} = {},
		) => {
			if (preserveQuery) {
				const toUrl = new URL(to, location.href);
				for (const [key, value] of new URLSearchParams(location.search)) {
					toUrl.searchParams.append(key, value);
				}
				to = toUrl.pathname + toUrl.search + toUrl.hash;
			}
			events.dispatchEvent(new WillNavigateEvent());
			// if paths are equal for this navigation, preserve current
			// route id
			const id = preserveScroll ? history.state?.id ?? 'initial' : generateId();
			const routeState = {
				state,
				skipTransition,
				id,
			};
			if (replace) {
				window.history.replaceState(routeState, '', to);
			} else {
				window.history.pushState(routeState, '', to);
			}
			window.dispatchEvent(
				new PopStateEvent('popstate', {
					state: routeState,
				}),
			);
		},
		[events],
	);
}

/**
 * Returns a match against the currently active routes at the current level for the
 * given path.
 *
 * For example, if the current location is /foo/bar/baz, and this
 * hook is called in a component at level /foo/bar, the match will
 * return a match for /baz, but not /qux or /foo.
 */
export function useMatch({ path, end }: { path: string; end?: boolean }) {
	const { match } = useContext(RouteLevelContext);
	return useMemo(
		() =>
			matchPath(match?.remainingPath ?? '', {
				path,
				exact: end,
				component: Null,
			}),
		[match?.remainingPath, path, end],
	);
}

const Null = () => null;

/**
 * Returns current query (search) params and a method to update
 * them which either takes previous and returns a new URLSearchParams,
 * accepts a URLSearchParams object outright.
 */
export function useSearchParams() {
	const [params, internalSetParams] = useState(
		new URLSearchParams(location.search),
	);
	useOnLocationChange(() =>
		internalSetParams(new URLSearchParams(location.search)),
	);
	const setParams = useCallback(
		(
			params: URLSearchParams | ((old: URLSearchParams) => URLSearchParams),
			options: {
				state?: any;
				skipTransition?: boolean;
				replace?: boolean;
			} = {},
		) => {
			const newParams =
				typeof params === 'function'
					? params(new URLSearchParams(location.search))
					: new URLSearchParams(params);

			const routeState = {
				state: options.state,
				skipTransition: options.skipTransition,
				// keep the current route id for search changes
				id: history.state?.id ?? 'initial',
				isSearch: true,
			};
			const newSearch = newParams.toString();
			if (newSearch !== location.search) {
				if (options.replace) {
					window.history.replaceState(routeState, '', `?${newSearch}`);
				} else {
					window.history.pushState(routeState, '', `?${newSearch}`);
				}
				window.dispatchEvent(new PopStateEvent('popstate'));
				internalSetParams(newParams);
			}
		},
		[internalSetParams],
	);
	return [params, setParams] as const;
}

/**
 * Returns the current route state (additional data you can attach
 * to route changes in useNavigate or as a prop to Link).
 */
export function useRouteState() {
	const [state, setState] = useState(() => window.history.state);
	useOnLocationChange((location, state) => setState(state));
	return state;
}

/**
 * Allows custom handling of scroll restoration.
 * Provide a function to get the current scroll position and a function to
 * restore the scroll position by applying it.
 * This allows you full control to track scrolling in a custom element,
 * wait for animations, etc.
 */
export function useScrollRestoration({
	onGetScrollPosition,
	onScrollRestored,
	debug,
	id,
}: {
	/**
	 * Return the current scroll position for the current route.
	 * Return false to keep the previous known position.
	 */
	onGetScrollPosition: () => [number, number] | false;
	onScrollRestored: (position: [number, number], isFirstVisit: boolean) => void;
	debug?: boolean;
	/**
	 * If you are restoring multiple scroll containers which may be
	 * rendered at the same time, you should provide a unique ID
	 * for each one so they get assigned the correct scroll position.
	 */
	id?: string;
}) {
	const [routeId, setRouteId] = useState(() => {
		return history.state?.id ?? 'initial';
	});
	useOnLocationChange((_, state) => {
		setRouteId(state?.id ?? 'initial');
	});
	// don't restore scroll until after transition is complete
	const transitioning = useIsRouteTransitioning();

	const restoreKey = `${id ?? 'default'}__${routeId}`;

	const stableOnScrollRestored = useStableCallback(onScrollRestored);
	const stableOnGetScrollPosition = useStableCallback(onGetScrollPosition);

	const restoredKeyRef = useRef<string | null>(null);
	// restore scroll position on mount
	useEffect(() => {
		// don't restore scroll until after transition is complete
		if (transitioning) return;

		// using this ref to prevent double invocation of this
		// effect in dev mode, since that would record 0,0 for
		// scroll in some cases and errantly restore it
		if (restoredKeyRef.current !== restoreKey) {
			const scroll = getScrollPosition(restoreKey);
			if (debug) {
				console.log(
					`Restoring scroll position for key ${restoreKey} to ${scroll}`,
				);
			}
			if (scroll) {
				onScrollRestored(scroll, false);
			} else {
				onScrollRestored([0, 0], true);
			}
			restoredKeyRef.current = restoreKey;
		}
	}, [restoreKey, stableOnScrollRestored, debug, transitioning]);

	// record scroll position on unmount
	useEffect(() => {
		return () => {
			const scroll = stableOnGetScrollPosition();
			if (scroll) {
				recordScrollPosition(restoreKey, scroll);
				if (debug) {
					console.log(
						`Recording scroll position for key ${restoreKey} as ${scroll}`,
					);
				}
			}
		};
	}, [restoreKey, stableOnGetScrollPosition]);
}
