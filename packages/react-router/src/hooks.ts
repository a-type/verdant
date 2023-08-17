import {
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { IndexRouteConfig, RouteConfig, RouteMatch } from './types.js';
import { pathToRegexp, Key } from 'path-to-regexp';
import {
	RouteLevelContext,
	useRootMatch,
	useLocationPath,
	useEvents,
} from './context.js';
import { generateId, joinPaths } from './util.js';
import {
	getAllMatchingRoutes,
	getBestRouteMatch,
	matchPath,
} from './resolution.js';
import { WillNavigateEvent } from './events.js';
import {
	consumeScrollPosition,
	getScrollPosition,
	recordScrollPosition,
} from './scrollPositions.js';

function useStableCallback<T extends Function>(cb: T): T {
	const ref = useRef(cb);
	ref.current = cb;
	return useCallback((...args: any[]) => ref.current(...args), []) as any as T;
}

export function useOnLocationChange(
	callback: (
		location: Location,
		state: {
			state?: any;
			skipTransition?: boolean;
			id: string;
		},
	) => void,
) {
	const cb = useStableCallback(callback);
	useLayoutEffect(() => {
		const handler = (ev: PopStateEvent) =>
			cb(
				location,
				ev.state || {
					id: 'initial',
				},
			);
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, [cb]);
}

const EMPTY_ROUTES: RouteConfig[] = [];

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

export function useParams<Shape extends Record<string, string>>(): Shape {
	const matches = useMatchingRoutes();
	return useMemo(() => {
		return matches.reduce((params, match) => {
			Object.assign(params, match.params);
			return params;
		}, {} as any as Shape);
	}, [matches]);
}

export function useMatchingRoute(): RouteMatch | null {
	const { match } = useContext(RouteLevelContext);
	return match;
}

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

export function useNavigate() {
	const events = useEvents();

	return useCallback(
		(
			to: string,
			{
				replace,
				skipTransition,
				state = null,
			}: { replace?: boolean; skipTransition?: boolean; state?: any } = {},
		) => {
			events.dispatchEvent(new WillNavigateEvent());
			const id = generateId();
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

export function useSearchParams() {
	const [params, internalSetParams] = useState(
		new URLSearchParams(location.search),
	);
	useOnLocationChange(() =>
		internalSetParams(new URLSearchParams(location.search)),
	);
	const setParams = useCallback(
		(params: URLSearchParams | ((old: URLSearchParams) => URLSearchParams)) => {
			const newParams =
				typeof params === 'function'
					? params(new URLSearchParams(location.search))
					: new URLSearchParams(params);
			const newSearch = newParams.toString();
			if (newSearch !== location.search) {
				window.history.pushState(null, '', `?${newSearch}`);
				window.dispatchEvent(new PopStateEvent('popstate'));
				internalSetParams(newParams);
			}
		},
		[internalSetParams],
	);
	return [params, setParams] as const;
}

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

	const restoreKey = `${id ?? 'default'}__${routeId}`;

	const stableOnScrollRestored = useStableCallback(onScrollRestored);
	const stableOnGetScrollPosition = useStableCallback(onGetScrollPosition);

	const restoredKeyRef = useRef<string | null>(null);
	useEffect(() => {
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
	}, [restoreKey, stableOnScrollRestored, debug]);
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
