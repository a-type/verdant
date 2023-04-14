import { ComponentType } from 'react';

export type RouteConfig = {
	path: string;
	component: ComponentType;
	children?: RouteConfig[];
	exact?: boolean;
	onAccessible?: () => void;
	onVisited?: () => void;
};

export type RouterConfig = Array<RouteConfig>;

export type RouteMatch = {
	route: RouteConfig;
	path: string;
	params: Record<string, string>;
};
