import { ComponentType } from 'react';

export type RouteConfig = {
	path: string;
	component: ComponentType;
	children?: RouteConfig[];
};

export type RouterConfig = Array<RouteConfig>;
