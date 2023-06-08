import { ComponentType } from 'react';

type CommonRouteConfig = {
	component: ComponentType;
	children?: RouteConfig[];
	onVisited?: (params: { [key: string]: string }) => void;
	data?: any;
};

export type PathRouteConfig = CommonRouteConfig & {
	path: string;
	exact?: boolean;
};

export type IndexRouteConfig = CommonRouteConfig & {
	index: true;
};

export type RouteConfig = PathRouteConfig | IndexRouteConfig;

export type RouteMatch = {
	route: RouteConfig;
	path: string;
	params: Record<string, string>;
};
