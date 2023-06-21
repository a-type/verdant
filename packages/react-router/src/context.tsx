import { ReactNode, createContext, useContext } from 'react';
import { RouteMatch } from './types.js';

type RouteLevelContextValue = {
	match: RouteMatch | null;
	subpath: string;
	// these accumulate for each level
	params?: Record<string, string>;
};

export const RouteLevelContext = createContext<RouteLevelContextValue>({
	match: null,
	subpath: '',
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
	path: string;
	transitioning: boolean;
	events: EventTarget;
};

export const RouteGlobalContext = createContext<RouteGlobalContextValue>({
	rootMatch: null,
	path: '',
	transitioning: false,
	events: new EventTarget(),
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

export function useLocationPath(): string {
	const { path } = useContext(RouteGlobalContext);

	return path;
}

export function useEvents(): EventTarget {
	const { events } = useContext(RouteGlobalContext);

	return events;
}
