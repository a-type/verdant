import { proxy } from 'valtio';

// Initialize deferredPrompt for use later to show browser install prompt.
let deferredPrompt:
	| (Event & { prompt(): void; userChoice: { outcome: string } })
	| undefined = undefined;

export const installState = proxy({
	installReady: false,
});

window.addEventListener('beforeinstallprompt', (e) => {
	// Prevent the mini-infobar from appearing on mobile
	e.preventDefault();
	// Stash the event so it can be triggered later.
	deferredPrompt = e as any;
	// Update UI notify the user they can install the PWA
	installState.installReady = true;
	// Optionally, send analytics event that PWA install promo was shown.
	console.log(`Ready to show custom install prompt`);
});

export function triggerInstall() {
	if (!deferredPrompt) return;
	// Show the install prompt
	deferredPrompt.prompt();
}
