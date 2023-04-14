import { RouteConfig } from './types.js';

/**
 * Flattens nested routes into an array of full path-matched
 * routes
 */
export function flattenRoutes(root: RouteConfig) {
	const routes = [root];
	for (let i = 0; i < routes.length; i++) {
		const route = routes[i];
		if (route.children) {
			routes.push(
				...route.children.map((child) => ({
					...child,
					path: `${route.path}${child.path}`,
				})),
			);
		}
	}
	return routes;
}
