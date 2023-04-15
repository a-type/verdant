import { ReactNode, createContext, useContext } from 'react';
import { RouteConfig, RouteMatch } from './types.js';

type RouteLevelContextValue = {
	parent: RouteMatch | null;
	match: RouteMatch | null;
	subpath: string;
	transitioning: boolean;
	// these accumulate for each level
	params: Record<string, string>;
};

export const RouteLevelContext = createContext<RouteLevelContextValue>({
	parent: null,
	match: null,
	subpath: '',
	transitioning: false,
	params: {},
});

export const RouteLevelProvider = ({
	children,
	...props
}: RouteLevelContextValue & { children: ReactNode }) => {
	return (
		<RouteLevelContext.Provider value={props}>
			{children}
		</RouteLevelContext.Provider>
	);
};

export function useParams<Shape extends Record<string, string>>(): Shape {
	const { params } = useContext(RouteLevelContext);

	return (params || {}) as any;
}

type RouteGlobalContextValue = {
	rootMatch: RouteMatch | null;
};

export const RouteGlobalContext = createContext<RouteGlobalContextValue>({
	rootMatch: null,
});

export const RouteGlobalProvider = ({
	children,
	...props
}: RouteGlobalContextValue & { children: ReactNode }) => {
	return (
		<RouteGlobalContext.Provider value={props}>
			{children}
		</RouteGlobalContext.Provider>
	);
};

export function useRootMatch(): RouteMatch | null {
	const { rootMatch } = useContext(RouteGlobalContext);

	return rootMatch;
}
