import { ReactNode, useEffect, useMemo, useState, useTransition } from 'react';
import { RouteConfig, RouteMatch } from './types.js';
import { RouteGlobalProvider, RouteLevelProvider } from './context.js';
import { Outlet } from './Outlet.js';
import { useOnLocationChange } from './hooks.js';

export interface RouterProps {
	children: ReactNode;
	routes: RouteConfig[];
	onNavigate?: (
		path: string,
		routerState: {
			state?: any;
			skipTransition?: boolean;
		},
	) => boolean | void;
}

const Root = () => <Outlet />;

export function Router({ children, routes, onNavigate }: RouterProps) {
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

	useOnLocationChange((location, state) => {
		const cancelNavigation = onNavigate?.(location.pathname, state) === false;
		if (cancelNavigation) return;

		if (state?.skipTransition) {
			setPath(location.pathname);
		} else {
			startTransition(() => {
				setPath(location.pathname);
			});
		}
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
