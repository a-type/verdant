import React from 'react';
import styles from './MusicPlayer.module.css';

export function MusicPlayer() {
	const ref = React.useRef<HTMLAudioElement>(null);

	React.useEffect(() => {
		const audio = ref.current;
		if (audio) {
			audio.volume = 0.25;
		}
	}, []);

	return (
		<div className={styles.player}>
			<audio controls loop ref={ref} autoPlay src="/music/subway day.mp3" />
		</div>
	);
}
