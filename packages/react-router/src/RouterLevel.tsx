import { ReactNode, createContext, useContext } from 'react';
import { RouteConfig } from './types.js';
import { useMatchingRoute } from './hooks.js';

type RouterContextValue = {
	matchingRoute: RouteConfig | null;
	path: string;
};

export const RouterContext = createContext<RouterContextValue>({
	matchingRoute: null,
	path: '',
});

export function RouterLevel({
	children,
	rootPath,
	rootRoute,
}: {
	children: ReactNode;
	rootPath?: string;
	rootRoute?: RouteConfig;
}) {
	const { matchingRoute: contextParentRoute, path: contextParentPath } =
		useContext(RouterContext);

	const parentRoute = rootRoute ?? contextParentRoute;
	const parentPath = rootPath ?? contextParentPath;

	const matchingRoute = useMatchingRoute(
		parentRoute?.children ?? [],
		parentPath,
	);

	const remainingPath = matchingRoute?.path ?? '';

	const contextValue = {
		matchingRoute,
		path: remainingPath,
	};

	return (
		<RouterContext.Provider value={contextValue}>
			{children}
		</RouterContext.Provider>
	);
}
