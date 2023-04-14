export function delay(time: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, time));
}
