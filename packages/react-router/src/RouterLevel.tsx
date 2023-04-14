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
	rootPath: string;
	rootRoute: RouteConfig | null;
}) {
	const [matchingRoute, remainingPath] = useMatchingRoute(
		rootRoute?.children ?? [],
		rootPath,
	);

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
