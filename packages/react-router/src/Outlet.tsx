import { useContext } from 'react';
import { RouterContext, RouterLevel } from './RouterLevel.js';

export function Outlet() {
	const { matchingRoute, path } = useContext(RouterContext);

	const Component = matchingRoute?.component ?? null;

	if (Component) {
		return (
			<RouterLevel rootRoute={matchingRoute} rootPath={path}>
				<Component />
			</RouterLevel>
		);
	}

	return null;
}
