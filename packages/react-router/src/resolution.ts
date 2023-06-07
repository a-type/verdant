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
	fullPath: string,
	basePath: string,
	route: RouteConfig,
): RouteMatch | null {
	const keys: Key[] = [];
	const { path, exact } = getRoutePath(route);
	const re = pathToRegexp(joinPaths(basePath, path), keys, { end: !!exact });
	const match = re.exec(fullPath);
	if (!match) {
		return null;
	}
	const params = keys.reduce((params, key, index) => {
		params[key.name] = match[index + 1];
		return params;
	}, {} as Record<string, string>);
	return { path: isWildcardRoute(route) ? fullPath : match[0], params, route };
}

export function getBestRouteMatch(
	fullPath: string,
	basePath: string,
	routes: RouteConfig[],
): RouteMatch | null {
	for (const route of routes) {
		const match = matchPath(fullPath, basePath, route);
		if (match) {
			return match;
		}
	}
	return null;
}

export function getAllMatchingRoutes(
	fullPath: string,
	basePath: string,
	routes: RouteConfig[],
): RouteMatch[] {
	const match = getBestRouteMatch(fullPath, basePath, routes);
	if (!match) {
		return [];
	}

	const childRoutes = match.route.children;
	if (!childRoutes) {
		return [match];
	}

	return [match].concat(
		...getAllMatchingRoutes(fullPath, match.path, childRoutes),
	);
}
