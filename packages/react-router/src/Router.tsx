import { ReactNode, useEffect, useState, useTransition } from 'react';
import { RouterLevel } from './RouterLevel.js';
import { RouteConfig } from './types.js';

export interface RouterProps {
	children: ReactNode;
	routes: RouteConfig[];
	rootPath?: string;
}

export function Router({ children, routes }: RouterProps) {
	// cannot be changed at runtime
	const [rootRoute] = useState(() => ({
		path: '',
		children: routes,
		component: () => null,
	}));
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
		<RouterLevel rootPath={path} rootRoute={rootRoute}>
			{children}
		</RouterLevel>
	);
}
