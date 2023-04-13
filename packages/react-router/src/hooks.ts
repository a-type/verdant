import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { RouteConfig } from './types.js';

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
		handler();
		return () => window.removeEventListener('popstate', handler);
	}, [cb]);
}

export function useMatchingRoute(routes: RouteConfig[], basePath: string) {
	const [route, setRoute] = useState<RouteConfig | null>(null);

	useLocationChange((location) => {
		const path = location.pathname.replace(basePath, '');
		console.log(routes, path);
		const matchingRoute = routes.find((route) => route.path.startsWith(path));
		setRoute(matchingRoute || null);
	});

	return route;
}
