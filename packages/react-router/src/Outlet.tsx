import { useContext } from 'react';
import { RouterLevel } from './RouterLevel.js';
import { RouteLevelContext } from './context.js';

export function Outlet() {
	const { match, subpath, transitioning } = useContext(RouteLevelContext);

	const Component = match?.route?.component ?? null;

	if (Component) {
		return (
			<RouterLevel
				parent={match}
				rootPath={subpath}
				transitioning={transitioning}
			>
				<Component />
			</RouterLevel>
		);
	}

	return null;
}
