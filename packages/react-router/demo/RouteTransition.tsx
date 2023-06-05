import { useEffect, useRef, useState } from 'react';
import { useNextMatchingRoute, Route, Outlet } from '../src/index.js';

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

	console.log('PREVIOUS MATCH', previousMatch);
	console.log('UPCOMING MATCH', match);

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
				>
					<Route value={previousMatch} />
				</div>
			)}
			<div
				ref={newRouteContainerRef}
				style={{
					width: '100%',
					height: '100%',
				}}
			>
				<Outlet />
			</div>
		</div>
	);
}
