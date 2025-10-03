// FAIL LOUDLY on unhandled promise rejections / errors
window.addEventListener('unhandledrejection', (event) => {
	// eslint-disable-next-line no-console
	console.error(`❌ FAILED TO HANDLE PROMISE REJECTION`, event.reason);

	throw event.reason;
});
