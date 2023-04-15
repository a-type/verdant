import { RouteConfig } from './types.js';

export function makeRoutes<Routes extends RouteConfig[]>(
	routes: Routes,
): Routes {
	return routes;
}
