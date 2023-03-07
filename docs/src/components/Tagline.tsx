import React, { useCallback, useEffect, useState } from 'react';
import styles from './Tagline.module.css';

const options = [
	'Scroll down!',
	'Subway-tolerant apps',
	'Say goodbye to writing optimistic UI',
	'Never write an API again',
	'Offline-only is a breeze - and sync is one step away',
	"It's not webscale!",
	'I learned texture baking to make this page',
	'Surely this is the year of the PWA!',
];

export function Tagline() {
	const [i, setI] = useState(0);

	const flip = useCallback(() => {
		setI((i) => (i + 1) % options.length);
	}, [setI]);

	useEffect(() => {
		const interval = setInterval(flip, 10000);
		return () => clearInterval(interval);
	}, [flip]);

	return (
		<div className={styles.root}>
			<div key={i} className={styles.current}>
				{options[i]}
			</div>
			<div key={i + 1} className={styles.next}>
				{options[(i + 1) % options.length]}
			</div>
		</div>
	);
}
