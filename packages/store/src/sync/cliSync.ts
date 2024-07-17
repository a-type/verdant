export function cliSync<Presence extends any = any>(
	libraryId: string,
	{
		port = 3242,
		initialPresence = {} as any,
	}: { port?: number; initialPresence?: Presence } = {},
) {
	let userId = localStorage.getItem('verdant-userId');
	if (!userId) {
		userId = `user-${Math.random().toString(36).slice(2)}`;
		localStorage.setItem('verdant-userId', userId);
	}
	return {
		defaultProfile: { id: userId },
		initialPresence,
		authEndpoint: `http://localhost:${port}/auth/${libraryId}?userId=${userId}`,
	};
}
