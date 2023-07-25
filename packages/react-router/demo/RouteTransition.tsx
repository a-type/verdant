import { useEffect, useRef, useState } from 'react';
import { useNextMatchingRoute, Outlet } from '../src/index.js';
import { RouteRenderer } from '../src/Route.js';

export interface RouteTransitionProps {}

const DURATION = 300;

export function RouteTransition({}: RouteTransitionProps) {
	const match = useNextMatchingRoute();

	const [previousMatch, setPreviousMatch] = useState(match);

	const oldRouteContainerRef = useRef<HTMLDivElement>(null);
	const newRouteContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!previousMatch || !match) return;
		if (previousMatch.route !== match.route) {
			const oldContainer = oldRouteContainerRef.current;
			const newContainer = newRouteContainerRef.current;
			if (!newContainer) return;

			if (oldContainer) {
				oldContainer.getAnimations().forEach((animation) => {
					animation.cancel();
				});
				oldContainer.animate(
					[
						{
							transform: 'translateX(100%)',
						},
						{
							transform: 'translateX(0)',
						},
					],
					{
						duration: DURATION,
						easing: 'linear',
						fill: 'forwards',
					},
				);
			}
			newContainer.style.transform = 'translateX(100%)';
			const animation = newContainer.animate(
				[
					{
						transform: 'translateX(100%)',
					},
					{
						transform: 'translateX(0)',
					},
				],
				{
					duration: DURATION,
					easing: 'linear',
					fill: 'forwards',
				},
			);
			animation.onfinish = () => {
				setPreviousMatch(match);
			};
		}
	}, [previousMatch, match]);

	const previousKey = previousMatch
		? previousMatch.path + JSON.stringify(previousMatch.params)
		: '';
	const currentKey = match ? match.path + JSON.stringify(match.params) : '';

	return (
		<div
			style={{
				position: 'relative',
				overflow: 'hidden',
				display: 'flex',
				flex: 1,
			}}
		>
			{!!previousMatch && !!match && previousMatch?.route !== match.route && (
				<div
					ref={oldRouteContainerRef}
					style={{
						width: '100%',
						height: '100%',
						position: 'absolute',
						left: '-100%',
					}}
					key={previousKey}
				>
					<RouteRenderer value={previousMatch} />
				</div>
			)}
			<div
				ref={newRouteContainerRef}
				style={{
					width: '100%',
					height: '100%',
				}}
				key={currentKey}
			>
				<Outlet />
			</div>
		</div>
	);
}
