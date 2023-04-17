import { ReactNode, useEffect, useMemo, useState, useTransition } from 'react';
import { RouteConfig, RouteMatch } from './types.js';
import { RouteGlobalProvider, RouteLevelProvider } from './context.js';
import { Outlet } from './Outlet.js';
import { useLocationChange } from './hooks.js';

export interface RouterProps {
	children: ReactNode;
	routes: RouteConfig[];
}

const Root = () => <Outlet />;

export function Router({ children, routes }: RouterProps) {
	const rootRoute = useMemo<RouteConfig>(
		() => ({
			path: '',
			children: routes,
			component: Root,
		}),
		[routes],
	);
	const root: RouteMatch = useMemo(
		() => ({
			path: '',
			params: {},
			route: rootRoute,
		}),
		[rootRoute],
	);
	const [path, setPath] = useState(() => window.location.pathname);
	const [transitioning, startTransition] = useTransition();

	useLocationChange((location) => {
		startTransition(() => {
			setPath(location.pathname);
		});
	});

	return (
		<RouteGlobalProvider
			rootMatch={root}
			path={path}
			transitioning={transitioning}
		>
			<RouteLevelProvider subpath={''} match={root}>
				{children}
			</RouteLevelProvider>
		</RouteGlobalProvider>
	);
}
