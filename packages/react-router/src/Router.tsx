import { ReactNode, useEffect, useMemo, useState, useTransition } from 'react';
import { RouteConfig, RouteMatch } from './types.js';
import { RouteGlobalProvider, RouteLevelProvider } from './context.js';
import { Outlet } from './Outlet.js';

export interface RouterProps {
	children: ReactNode;
	routes: RouteConfig[];
}

const Root = () => <Outlet />;

export function Router({ children, routes }: RouterProps) {
	// cannot be changed at runtime
	const [rootRoute] = useState<RouteConfig>(() => ({
		path: '',
		children: routes,
		component: Root,
	}));
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

	useEffect(() => {
		const listener = () => {
			startTransition(() => {
				setPath(window.location.pathname);
			});
		};
		window.addEventListener('popstate', listener);
		return () => window.removeEventListener('popstate', listener);
	}, []);

	return (
		<RouteGlobalProvider rootMatch={root}>
			<RouteLevelProvider
				subpath={path}
				match={root}
				transitioning={transitioning}
			>
				{children}
			</RouteLevelProvider>
		</RouteGlobalProvider>
	);
}
