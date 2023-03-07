import React, { useCallback, useEffect, useState } from 'react';
import styles from './Tagline.module.css';

const options = [
	'Subway-tolerant apps',
	'Say goodbye to writing optimistic UI',
	'Build your app with 1 backend file',
	'Offline-only is a breeze - adding sync is even easier',
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
