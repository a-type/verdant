import { useContext } from 'react';
import { RouterContext } from './RouterLevel.js';

export function Outlet() {
	const { matchingRoute } = useContext(RouterContext);

	const Component = matchingRoute?.component ?? null;

	if (Component) {
		return <Component />;
	}

	return null;
}
