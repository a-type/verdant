import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { RouteConfig } from './types.js';
import { pathToRegexp, Key } from 'path-to-regexp';

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

function matchPath(path: string, route: RouteConfig) {
	const keys: Key[] = [];
	const re = pathToRegexp(route.path, keys, { end: !!route.exact });
	console.log('Matching', path, 'against', route.path, 'with', re);
	const match = re.exec(path);
	if (!match) {
		console.log('No match for', path, 'and', route.path);
		return null;
	}
	const params = keys.reduce((params, key, index) => {
		params[key.name] = match[index + 1];
		return params;
	}, {} as Record<string, string>);
	return { path: match[0], params };
}

export function useMatchingRoute(routes: RouteConfig[], basePath: string) {
	const getMatchingRoute = useCallback(() => {
		const matchingRoute = routes.find((route) => matchPath(basePath, route));
		return matchingRoute || null;
	}, [routes, basePath]);

	const [route, setRoute] = useState<RouteConfig | null>(() => {
		return getMatchingRoute();
	});

	const path = useLocationPath();

	useEffect(() => {
		setRoute(getMatchingRoute());
	}, [path, getMatchingRoute]);

	const remainingPath = removeRoutePath(path, route);

	console.log(
		'From',
		routes,
		'and',
		'"',
		basePath,
		'"',
		'(',
		path,
		')',
		'we got',
		route,
		'and',
		remainingPath,
	);

	return [route, remainingPath] as const;
}

function removeRoutePath(path: string, route: RouteConfig | null) {
	if (!route) {
		return path;
	}
	const segments = route.path.split('/');
	const pathSegments = path.split('/');
	return pathSegments.slice(segments.length).join('/');
}
