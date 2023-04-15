import { ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { RouteLevelContext } from './context.js';

export interface TransitionIndicatorProps {
	children: ReactNode;
	/**
	 * Delay showing the indicator until the transition has been pending for this
	 * long. This is useful for avoiding flickering when the transition is
	 * fast.
	 */
	delay?: number;
}

export function TransitionIndicator({
	children,
	delay,
}: TransitionIndicatorProps) {
	const show = useIsRouteTransitioning(delay);
	if (show) return <>{children}</>;
	return null;
}

export function useIsRouteTransitioning(delay?: number) {
	const { transitioning } = useContext(RouteLevelContext);

	const delayedTransitioning = useDelayedValue(transitioning, delay ?? 0);

	// if transitioning is false, show false immediately regardless.
	// otherwise wait (delay) before showing true.
	return delay
		? !transitioning
			? false
			: delayedTransitioning
		: transitioning;
}

/**
 * Reacts to changes inputValue, but waits for delay before updating the
 * returned value. If the inputValue changes again before the delay has
 * elapsed, the timer is reset.
 */
function useDelayedValue(inputValue: boolean, delay: number) {
	const [value, setValue] = useState(inputValue);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (inputValue === value) return;

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			setValue(inputValue);
		}, delay);
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [inputValue, delay]);

	return value;
}
