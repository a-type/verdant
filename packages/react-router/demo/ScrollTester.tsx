import { useRef } from 'react';
import { RestoreScroll } from '../src';

export function ScrollTester(props: any) {
	return (
		<div {...props}>
			<RestoreScroll debug />
			{new Array(10).fill(0).map((_, i) => (
				<div
					key={i}
					style={{
						height: '100vh',
						border: '1px solid black',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<div style={{ fontSize: '10vh' }}>{i}</div>
				</div>
			))}
		</div>
	);
}

export function ContainerScrollTester(props: any) {
	const ref = useRef<HTMLDivElement>(null);
	return (
		<div
			{...props}
			style={{
				overflowY: 'auto',
				height: '50vh',
			}}
			ref={ref}
		>
			<RestoreScroll scrollableRef={ref} debug />
			{new Array(10).fill(0).map((_, i) => (
				<div
					key={i}
					style={{
						height: '100vh',
						border: '1px solid black',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<div style={{ fontSize: '10vh' }}>{i}</div>
				</div>
			))}
		</div>
	);
}
