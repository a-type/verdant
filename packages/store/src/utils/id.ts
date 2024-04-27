import cuid from 'cuid';

export function id(short?: boolean) {
	if (short) return cuid.slug();
	return cuid();
}
