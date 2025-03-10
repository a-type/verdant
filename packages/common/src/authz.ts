import { DocumentBaseline } from './baseline.js';
import { Operation } from './operation.js';

function encode(str: string): AuthorizationKey {
	if (typeof Buffer !== 'undefined') {
		const val = Buffer.from(str).toString('base64');
		return val as AuthorizationKey;
	}
	const val = btoa(str);
	return val as AuthorizationKey;
}

function decode(str: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(str, 'base64').toString();
	}
	return atob(str);
}

export type AuthorizationKey = string & {
	// virtual type only used for type checking to try to sort
	// out between encoded and decoded string values.
	'@@type': 'authz';
};

export const authz = {
	onlyUser: (userId: string): AuthorizationKey => encode(`u:${userId}:*`),
	onlyMe: (): AuthorizationKey => authz.onlyUser(ORIGINATOR_SUBJECT),
	decode: (encoded: string) => {
		const decoded = decode(encoded);
		const parts = decoded.split(':');
		if (parts.length !== 3) {
			throw new Error('Invalid authz string');
		}
		return {
			scope: parts[0],
			subject: parts[1],
			action: parts[2],
		};
	},
};

export const ORIGINATOR_SUBJECT = '$$_originator_$$';

/**
 * Rewrites the special "originator" constant subject (used by
 * local-only clients) to the given user ID.
 *
 * Used to initialize a library from a local-only replica
 */
export function rewriteAuthzOriginator(
	data: { operations?: Operation[]; baselines?: DocumentBaseline[] },
	newSubject: string,
) {
	const { operations, baselines } = data;
	if (operations) {
		for (const op of operations) {
			if (op.authz) {
				const decoded = authz.decode(op.authz);
				if (decoded.subject === ORIGINATOR_SUBJECT) {
					op.authz = authz.onlyUser(newSubject);
				}
			}
		}
	}
	if (baselines) {
		for (const baseline of baselines) {
			if (baseline.authz) {
				const decoded = authz.decode(baseline.authz);
				if (decoded.subject === ORIGINATOR_SUBJECT) {
					baseline.authz = authz.onlyUser(newSubject);
				}
			}
		}
	}
}
