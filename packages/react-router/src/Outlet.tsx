import { useContext, useEffect } from 'react';
import { RouterLevel } from './RouterLevel.js';
import { RouteLevelContext } from './context.js';

export function Outlet() {
	const { parent, match, subpath, transitioning } =
		useContext(RouteLevelContext);

	const Component = match?.route?.component ?? null;

	if (Component) {
		return (
			<RouterLevel
				parent={match}
				rootPath={subpath}
				transitioning={transitioning}
				params={parent?.params}
			>
				<Component />
			</RouterLevel>
		);
	}

	return null;
}
