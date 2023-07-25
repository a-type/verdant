import {
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { IndexRouteConfig, RouteConfig, RouteMatch } from './types.js';
import { pathToRegexp, Key } from 'path-to-regexp';
import { RouteLevelContext, useRootMatch, useLocationPath } from './context.js';
import { joinPaths } from './util.js';

function isIndexRoute(route: RouteConfig): route is IndexRouteConfig {
	return (route as any).index === true;
}

function isWildcardRoute(route: RouteConfig): boolean {
	return (route as any).path === '*';
}

export function getRoutePath(route: RouteConfig): {
	path: string;
	exact: boolean;
} {
	if (isIndexRoute(route)) {
		return { path: '', exact: true };
	}
	if (route.path === '*') {
		return { path: '', exact: false };
	}
	return { path: route.path, exact: !!route.exact };
}

export function matchPath(
	/** What location the route is matched against */
	comparePath: string,
	/** Route to test for a match */
	route: RouteConfig,
): RouteMatch | null {
	const keys: Key[] = [];
	const { path, exact } = getRoutePath(route);
	const re = pathToRegexp(
		path.startsWith('/') ? path : path.length ? `/${path}` : path,
		keys,
		{ end: !!exact },
	);
	const match = re.exec(comparePath);
	if (!match) {
		return null;
	}
	const params = keys.reduce((params, key, index) => {
		params[key.name] = match[index + 1];
		return params;
	}, {} as Record<string, string>);
	const remainingPath = comparePath.slice(match[0].length);
	return {
		path: isWildcardRoute(route) ? comparePath : match[0],
		params,
		route,
		remainingPath,
	};
}

export function getBestRouteMatch(
	fullPath: string,
	routes: RouteConfig[],
): RouteMatch | null {
	for (const route of routes) {
		const match = matchPath(fullPath, route);
		if (match) {
			return match;
		}
	}
	return null;
}

export function getAllMatchingRoutes(
	fullPath: string,
	routes: RouteConfig[],
): RouteMatch[] {
	const match = getBestRouteMatch(fullPath, routes);
	if (!match) {
		return [];
	}

	const childRoutes = match.route.children;
	if (!childRoutes) {
		return [match];
	}

	return [match].concat(getAllMatchingRoutes(match.remainingPath, childRoutes));
}
