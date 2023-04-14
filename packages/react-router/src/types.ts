import { ComponentType } from 'react';

export type RouteConfig = {
	path: string;
	component: ComponentType;
	children?: RouteConfig[];
	exact?: boolean;
};

export type RouterConfig = Array<RouteConfig>;
