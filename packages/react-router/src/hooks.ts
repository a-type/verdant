import {
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { RouteConfig, RouteMatch } from './types.js';
import { pathToRegexp, Key } from 'path-to-regexp';
import { RouteGlobalContext, useRootMatch } from './context.js';

function useStableCallback<T extends Function>(cb: T): T {
	const ref = useRef(cb);
	ref.current = cb;
	return useCallback((...args: any[]) => ref.current(...args), []) as any as T;
}

export function useLocationChange(callback: (location: Location) => void) {
	const cb = useStableCallback(callback);
	useLayoutEffect(() => {
		const handler = () => cb(location);
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, [cb]);
}

export function useLocationPath() {
	const [path, setPath] = useState(location.pathname);
	useLocationChange(() => setPath(location.pathname));
	return path;
}

function matchPath(path: string, route: RouteConfig): RouteMatch | null {
	const keys: Key[] = [];
	const re = pathToRegexp(route.path, keys, { end: !!route.exact });
	const match = re.exec(path);
	if (!match) {
		return null;
	}
	const params = keys.reduce((params, key, index) => {
		params[key.name] = match[index + 1];
		return params;
	}, {} as Record<string, string>);
	return { path: match[0], params, route };
}

function existsFilter<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

function getRouteMatches(
	parent: RouteMatch | null,
	basePath: string,
): RouteMatch[] {
	const matches =
		parent?.route?.children
			?.map((route) => matchPath(basePath, route))
			.filter(existsFilter) ?? [];
	return matches;
}

function selectBestMatch(matches: RouteMatch[]): RouteMatch | null {
	return matches[0] || null;
}

function getBestRouteMatch(
	parent: RouteMatch | null,
	basePath: string,
): RouteMatch | null {
	const matches = getRouteMatches(parent, basePath);
	return selectBestMatch(matches);
}

export function useMatchingRoute(parent: RouteMatch | null, basePath: string) {
	const match = useMemo(
		() => getBestRouteMatch(parent, basePath),
		[parent, basePath],
	);

	const remainingPath = removeRoutePath(basePath, match?.route ?? null);

	return [match, remainingPath] as const;
}

function removeRoutePath(path: string, route: RouteConfig | null) {
	if (!route) {
		return path;
	}
	const segments = route.path.split('/');
	const pathSegments = path.split('/');
	return pathSegments.slice(segments.length).join('/');
}

function getAllMatchingRoutes(
	root: RouteMatch | null,
	path: string,
): RouteMatch[] {
	const match = getBestRouteMatch(root, path);
	if (!match) {
		return [];
	}

	const remainingPath = removeRoutePath(path, match?.route ?? null);
	if (remainingPath === '') {
		return [match];
	}

	return [match].concat(getAllMatchingRoutes(match, remainingPath));
}

/**
 * Returns the full list of matching routes for the given path.
 * A path will match exactly one leaf route; this is the traversal
 * from the root to that leaf.
 */
export function useRouteMatchesForPath(path: string): RouteMatch[] {
	const root = useRootMatch();

	const matches = useMemo(() => getAllMatchingRoutes(root, path), [root, path]);
	return matches;
}

export function useNavigate() {
	return useCallback((to: string, { replace }: { replace?: boolean } = {}) => {
		if (replace) {
			window.history.replaceState(null, '', to);
		} else {
			window.history.pushState(null, '', to);
		}
		window.dispatchEvent(new PopStateEvent('popstate'));
	}, []);
}

export function useMatch({ path, end }: { path: string; end?: boolean }) {
	const locationPath = useLocationPath();
	return useMemo(
		() => matchPath(locationPath, { path, exact: end, component: Null }),
		[locationPath, path, end],
	);
}

const Null = () => null;

export function useSearchParams() {
	const [params, internalSetParams] = useState(
		new URLSearchParams(location.search),
	);
	useLocationChange(() =>
		internalSetParams(new URLSearchParams(location.search)),
	);
	const setParams = useCallback(
		(params: URLSearchParams) => {
			const newParams = new URLSearchParams(params);
			const newSearch = newParams.toString();
			if (newSearch !== location.search) {
				window.history.pushState(null, '', `?${newSearch}`);
				window.dispatchEvent(new PopStateEvent('popstate'));
			}
		},
		[internalSetParams],
	);
	return [params, setParams] as const;
}
