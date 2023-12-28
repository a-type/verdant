import classNames from 'classnames';
import { debounce } from '@a-type/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParticles } from '@a-type/ui/components/particles';

export interface PopEffectProps {
	active?: boolean;
	className?: string;
}

export function PopEffect({ active, className }: PopEffectProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [animate, setAnimate] = useState(active);
	const cancelAnimation = useMemo(
		() => debounce(() => setAnimate(false), 1500),
		[setAnimate],
	);
	const particles = useParticles();

	useEffect(() => {
		if (active) {
			setAnimate(true);
			cancelAnimation();
			if (ref.current) {
				particles?.addParticles(
					particles.elementExplosion({
						element: ref.current,
						count: 20,
					}),
				);
			}
		}
	}, [active]);

	return (
		<div
			className={classNames(
				'absolute center translate--50% scale-0 bg-primary rounded-full w-50px h-50px overflow-hidden z--1',
				'[&[data-active=true]]:(animate-keyframes-pop animate-duration-1500 animate-ease-out animate-iteration-1)',
				className,
			)}
			data-active={animate}
			ref={ref}
		>
			<div
				className={classNames(
					'absolute center translate--50% scale-0 w-48px h-48px bg-white rounded-full z-0',
					'[&[data-active=true]]:(animate-keyframes-pop animate-duration-1000 animate-ease-out delay-500 animate-iteration-1)',
				)}
				data-active={animate}
			/>
		</div>
	);
}
