import { ReactNode, useState } from 'react';
import { RouterLevel } from './RouterLevel.js';
import { RouteConfig } from './types.js';

export interface RouterProps {
	children: ReactNode;
	rootRoute: RouteConfig;
	rootPath?: string;
}

export function Router({ children, rootRoute, rootPath = '' }: RouterProps) {
	// cannot be changed at runtime
	const [rootRouteCopy] = useState(rootRoute);
	return (
		<RouterLevel rootPath={rootPath} rootRoute={rootRouteCopy}>
			{children}
		</RouterLevel>
	);
}
