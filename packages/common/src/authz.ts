import { DocumentBaseline } from './baseline.js';
import { Operation } from './operation.js';

function encode(str: string): string {
	return Buffer.from(str).toString('base64');
}

function decode(str: string): string {
	return Buffer.from(str, 'base64').toString();
}

export const authz = {
	onlyUser: (userId: string) => encode(`u:${userId}:*`),
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
	data: { operations: Operation[]; baselines: DocumentBaseline[] },
	newSubject: string,
) {
	const { operations, baselines } = data;
	for (const op of operations) {
		if (op.authz) {
			const decoded = authz.decode(op.authz);
			if (decoded.subject === ORIGINATOR_SUBJECT) {
				op.authz = authz.onlyUser(newSubject);
			}
		}
	}
	for (const baseline of baselines) {
		if (baseline.authz) {
			const decoded = authz.decode(baseline.authz);
			if (decoded.subject === ORIGINATOR_SUBJECT) {
				baseline.authz = authz.onlyUser(newSubject);
			}
		}
	}
}
