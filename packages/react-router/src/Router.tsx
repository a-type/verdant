import {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from 'react';
import { RouteGlobalProvider, RouteLevelProvider } from './context.js';
import { PreviousLocation, RouteState, useOnLocationChange } from './hooks.js';
import { Outlet } from './Outlet.js';
import { RouteConfig, RouteMatch } from './types.js';
import { joinPaths, removeBasePath } from './util.js';

export interface RouterProps {
	children: ReactNode;
	routes: RouteConfig[];
	onNavigate?: (
		location: Location,
		routerState: {
			state?: any;
			skipTransition?: boolean;
		},
		previous: PreviousLocation,
	) => boolean | void;
	/**
	 * Pass this to re-enable browser-native scroll restoration
	 * instead of manually restoring scroll positions with the
	 * RestoreScroll component. i.e. if you are not using RestoreScroll.
	 */
	nativeScrollRestoration?: boolean;
	basePath?: string;
}

const Root = () => <Outlet />;

export function Router({
	children,
	routes,
	onNavigate,
	nativeScrollRestoration,
	basePath,
}: RouterProps) {
	const rootRoute = useMemo<RouteConfig>(
		() => ({
			path: '',
			children: routes,
			component: Root,
		}),
		[routes],
	);
	const [path, setPath] = useState(() =>
		removeBasePath(window.location.pathname, basePath),
	);
	const root: RouteMatch = useMemo(() => {
		const adjustedPath =
			basePath && path.startsWith(basePath)
				? path.slice(basePath.length)
				: path;
		return {
			path: basePath && adjustedPath !== path ? basePath : '',
			remainingPath: adjustedPath,
			params: {},
			route: rootRoute,
		};
	}, [rootRoute, path, basePath]);
	const [transitioning, startTransition] = useTransition();
	const [events] = useState(() => new EventTarget());

	const updatePath = useCallback(
		(newPath: string, state?: RouteState) => {
			if (state?.skipTransition) {
				setPath(newPath);
			} else {
				startTransition(() => {
					setPath(newPath);
				});
			}
		},
		[setPath, startTransition],
	);

	useEffect(() => {
		if (nativeScrollRestoration) return;

		window.history.scrollRestoration = 'manual';
		return () => {
			window.history.scrollRestoration = 'auto';
		};
	}, [nativeScrollRestoration]);

	// enforce base path
	useEffect(() => {
		if (basePath && !window.location.pathname.startsWith(basePath)) {
			window.history.replaceState(
				{},
				'',
				joinPaths(basePath, window.location.pathname) + window.location.search,
			);
		}
	}, [basePath]);

	return (
		<RouteGlobalProvider
			rootMatch={root}
			path={path}
			transitioning={transitioning}
			events={events}
			basePath={basePath || ''}
		>
			<PathManager setPath={updatePath} onNavigate={onNavigate}>
				<RouteLevelProvider match={root}>{children}</RouteLevelProvider>
			</PathManager>
		</RouteGlobalProvider>
	);
}

function PathManager({
	children,
	setPath,
	onNavigate,
}: {
	children: ReactNode;
	setPath: (path: string, state?: RouteState) => void;
	onNavigate?: RouterProps['onNavigate'];
}) {
	useOnLocationChange((location, state, previous) => {
		const cancelNavigation = onNavigate?.(location, state, previous) === false;
		if (cancelNavigation) return;

		setPath(location.pathname, state);
	});

	return <>{children}</>;
}
