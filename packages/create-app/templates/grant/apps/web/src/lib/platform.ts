export async function requestPersistentStorage() {
	if (getIsPWAInstalled() && navigator.storage && navigator.storage.persist) {
		const result = await navigator.storage.persist();
		console.log('Persistent storage:', result ? 'granted' : 'denied');
	}
}

export function getIsPWAInstalled() {
	return window.matchMedia('(display-mode: standalone)').matches;
}

export function getOS() {
	const userAgent = window.navigator.userAgent;
	const platform = window.navigator.platform;
	const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
	const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
	const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

	if (macosPlatforms.indexOf(platform) !== -1) {
		return 'Mac OS';
	} else if (iosPlatforms.indexOf(platform) !== -1) {
		return 'iOS';
	} else if (windowsPlatforms.indexOf(platform) !== -1) {
		return 'Windows';
	} else if (/Android/.test(userAgent)) {
		return 'Android';
	} else if (!platform && /Linux/.test(userAgent)) {
		return 'Linux';
	}

	return 'Other';
}

export function getIsSafari() {
	const ua = navigator.userAgent.toLowerCase();
	return !!ua.match(/WebKit/i) && !ua.match(/CriOS/i);
}

export function getIsFirefox() {
	const ua = navigator.userAgent.toLowerCase();
	return !!ua.match(/Firefox/i);
}

export function getIsEdge() {
	const ua = navigator.userAgent.toLowerCase();
	return !!ua.match(/Edge/i);
}
