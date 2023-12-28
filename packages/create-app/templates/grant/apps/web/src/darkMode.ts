export function setColorMode(mode: 'system' | 'light' | 'dark') {
	if (mode === 'system') {
		window.localStorage.removeItem('colorMode');
	} else {
		window.localStorage.setItem('colorMode', mode);
	}
	window.dispatchEvent(new Event('colorModeChanged'));
}

const updateMode = () => {
	const mode = window.localStorage.getItem('colorMode');
	document.documentElement.classList.remove('override-light', 'override-dark');
	if (mode) {
		document.documentElement.classList.add('override-' + mode);
	}

	// determine final mode, even if it's system
	const finalMode =
		mode ||
		(window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light');
	// set the status bar color in pwas
	const iosStatusBarColor = document.querySelector(
		'meta[name=apple-mobile-web-app-status-bar-style]',
	);
	const androidStatusBarColor = document.querySelector(
		'meta[name=theme-color]',
	);

	if (finalMode === 'dark') {
		iosStatusBarColor?.setAttribute('content', 'black');
		androidStatusBarColor?.setAttribute('content', '#000000');
	}
	if (finalMode === 'light') {
		iosStatusBarColor?.setAttribute('content', 'white');
		androidStatusBarColor?.setAttribute('content', '#ffffff');
	}
};
updateMode();

// listen for changes and apply an override-mode to the html
window.addEventListener('colorModeChanged', updateMode);

export function getColorMode(): 'system' | 'light' | 'dark' {
	return (window.localStorage.getItem('colorMode') as any) || 'system';
}

export function subscribeToColorModeChange(
	callback: (mode: 'system' | 'light' | 'dark') => void,
) {
	const update = () => callback(getColorMode());
	window.addEventListener('colorModeChanged', update);
	return () => {
		window.removeEventListener('colorModeChanged', update);
	};
}

(window as any).setColorMode = setColorMode;
