import { ReactNode, useEffect, useMemo, useState, useTransition } from 'react';
import { RouteConfig, RouteMatch } from './types.js';
import { RouteGlobalProvider, RouteLevelProvider } from './context.js';
import { Outlet } from './Outlet.js';
import { useOnLocationChange } from './hooks.js';
import { getScrollPosition, recordScrollPosition } from './scrollPositions.js';

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
	/**
	 * Pass this to re-enable browser-native scroll restoration
	 * instead of manually restoring scroll positions with the
	 * RestoreScroll component. i.e. if you are not using RestoreScroll.
	 */
	nativeScrollRestoration?: boolean;
}

const Root = () => <Outlet />;

export function Router({
	children,
	routes,
	onNavigate,
	nativeScrollRestoration,
}: RouterProps) {
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
	const [events] = useState(() => new EventTarget());

	useEffect(() => {
		if (nativeScrollRestoration) return;

		window.history.scrollRestoration = 'manual';
		return () => {
			window.history.scrollRestoration = 'auto';
		};
	}, [nativeScrollRestoration]);

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
			events={events}
		>
			<RouteLevelProvider subpath={''} match={root}>
				{children}
			</RouteLevelProvider>
		</RouteGlobalProvider>
	);
}
