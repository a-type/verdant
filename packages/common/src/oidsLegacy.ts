import {
	assignOid,
	createOid,
	decomposeOid,
	getOidRoot,
	ObjectIdentifier,
} from './oids.js';
import { isObject } from './utils.js';

export const LEGACY_OID_KEY = '__@@oid_do_not_use';
export const OID_KEY = '@@id';

export function maybeGetOidProperty(obj: any) {
	if (!isObject(obj)) {
		return undefined;
	}
	return obj[OID_KEY] || obj[LEGACY_OID_KEY];
}

function removeOidProperty(obj: any) {
	if (!isObject(obj)) {
		return obj;
	}
	delete obj[LEGACY_OID_KEY];
	delete obj[OID_KEY];
	return obj;
}

function copyOidFromPropertyToSystem(obj: any) {
	const oid = maybeGetOidProperty(obj);
	if (oid) {
		assignOid(obj, oid);
	}
}

/**
 *
 * Removes the special property from all objects in the given object
 * which have an OID, transferring the OID from the property to the OID
 * system in-memory.
 */
export function removeOidPropertiesFromAllSubObjects(obj: any) {
	copyOidFromPropertyToSystem(obj);
	removeOidProperty(obj);

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			removeOidPropertiesFromAllSubObjects(obj[i]);
		}
	} else if (isObject(obj)) {
		for (const key of Object.keys(obj)) {
			removeOidPropertiesFromAllSubObjects(obj[key]);
		}
	}
}

export function isLegacyDotOid(oid: ObjectIdentifier) {
	const partBeforeRandomSep = oid.split(':')[0];
	return partBeforeRandomSep.includes('.');
}

export function convertLegacyOid(oid: ObjectIdentifier) {
	const { collection, id, subId } = decomposeOid(oid);
	return createOid(collection, id, subId);
}

// NOTE: all legacy OIDs should now be gone.
export const MATCH_LEGACY_OID_JSON_STRING = /"\w+\/[^"]+?(\.[^"]+)+\:[\S]+?"/g;
export function replaceLegacyOidsInJsonString(string: string) {
	// replace every match of a legacy OID, converting to a new OID
	return string.replaceAll(MATCH_LEGACY_OID_JSON_STRING, (match) => {
		const legacyOid = match.slice(1, match.length - 1);
		return `"${convertLegacyOid(legacyOid)}"`;
	});
}
export function replaceLegacyOidsInObject(obj: any) {
	return JSON.parse(replaceLegacyOidsInJsonString(JSON.stringify(obj)));
}

export function getLegacyDotOidSubIdRange(oid: ObjectIdentifier) {
	const root = getOidRoot(oid);
	return [`${root}.`, `${root}.\uffff`];
}

export function isOidKey(key: string) {
	return key === OID_KEY || key === LEGACY_OID_KEY;
}
