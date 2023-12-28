import { useIsRouteTransitioning } from '@verdant-web/react-router';
import { animated, useSpring } from '@react-spring/web';
import classNames from 'classnames';
import { useCallback, useEffect } from 'react';

export interface TopLoaderProps {
	className?: string;
}

export function TopLoader({ className }: TopLoaderProps) {
	const show = useIsRouteTransitioning(500);

	const [style, spring] = useSpring(() => ({
		width: '0%',
	}));

	const run = useCallback(() => {
		let timeout: NodeJS.Timer | undefined;
		function step(previous: number) {
			spring.start({
				width: `${previous}%`,
			});
			const nextStep = Math.min(
				95 - previous,
				Math.min((95 - previous) / 2, Math.random() * 20),
			);
			timeout = setTimeout(
				step,
				500 + Math.random() * 1000,
				previous + nextStep,
			);
		}
		step(0);
		return () => {
			if (timeout) clearTimeout(timeout);
			spring.start({
				width: '100%',
			});
		};
	}, [show, spring]);

	useEffect(() => {
		if (show) {
			return run();
		}
	}, [show, run]);

	return (
		<div
			className={classNames(
				'fixed top-0 left-0 w-full h-4px pointer-events-none op-0 z-100000',
				'[&[data-state=visible]]:(opacity-100 transition-opacity)',
				'md:(h-2px)',
				'motion-reduce:hidden',
				className,
			)}
			data-state={show ? 'visible' : 'hidden'}
		>
			<animated.div
				className="absolute top-0 left-0 h-full bg-accent"
				style={style}
			/>
		</div>
	);
}
