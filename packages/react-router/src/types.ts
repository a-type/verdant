import { ComponentType } from 'react';

export type RouteConfig = {
	path: string;
	component: ComponentType;
	children?: RouteConfig[];
	exact?: boolean;
	onAccessible?: (params: {
		[key: string]: string;
	}) => Promise<any> | (() => void) | void;
	onVisited?: (params: { [key: string]: string }) => void;
};

export type RouteMatch = {
	route: RouteConfig;
	path: string;
	params: Record<string, string>;
};
