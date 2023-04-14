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
import { RouteGlobalContext } from './context.js';

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

export function useMatchingRoute(parent: RouteMatch | null, basePath: string) {
	const getMatches = useCallback(() => {
		return (
			parent?.route?.children
				?.map((route) => matchPath(basePath, route))
				.filter(existsFilter) ?? []
		);
	}, [parent, basePath]);

	const matches = useMemo(() => getMatches(), [getMatches]);
	const match = matches[0] || null;

	const remainingPath = removeRoutePath(basePath, match?.route);

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

export function useRouteForPath(path: string) {
	const { flatRoutes } = useContext(RouteGlobalContext);
	const matches = useMemo(
		() =>
			flatRoutes.map((route) => matchPath(path, route)).filter(existsFilter),
		[flatRoutes, path],
	);
	return matches[0] || null;
}
