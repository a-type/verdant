/**
 * High-level patch creation for use with complex nested objects.
 */

import { AuthorizationKey } from './authz.js';
import { diffToPatches } from './diffing.js';
import { FileRef } from './files.js';
import { createRef, createSubOid, ObjectIdentifier } from './oids.js';
import {
	initialToPatches,
	ObjectRef,
	Operation,
	PropertyName,
} from './operation.js';
import { isRef } from './refs.js';
import { isObject } from './utils.js';

export class PatchCreator {
	constructor(
		readonly getNow: () => string,
		readonly createSubId?: () => string,
	) {}

	isPrimitive = (value: any) => {
		return !isObject(value) || isRef(value);
	};

	createDiff = (
		from: any,
		to: any,
		options: { mergeUnknownObjects?: boolean; defaultUndefined?: boolean } = {},
	) => {
		return diffToPatches(from, to, this.getNow, this.createSubId, [], options);
	};

	createInitialize = (
		obj: any,
		oid: ObjectIdentifier,
		authz?: AuthorizationKey,
	) => {
		return initialToPatches(
			obj,
			oid,
			this.getNow,
			this.createSubId,
			undefined,
			authz ? { authz } : undefined,
		);
	};

	createSet = (
		oid: ObjectIdentifier,
		key: PropertyName,
		value: any,
		authz?: string,
	): Operation[] => {
		// incoming value must be normalized. if it's not a primitive, it and all sub-objects
		// must be created
		if (this.isPrimitive(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'set',
						name: key,
						value,
					},
					authz,
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				// since we're setting a complex nested object, we can initialize it wholesale.
				// no diffing to do.
				...initialToPatches(
					value,
					itemOid,
					this.getNow,
					this.createSubId,
					undefined,
					{
						authz,
					},
				),
				// then set the reference to the object
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'set',
						value: createRef(itemOid),
						name: key,
					},
					authz,
				},
			];
		}
	};

	createRemove = (
		oid: ObjectIdentifier,
		key: PropertyName,
		authz?: string,
	): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'remove',
					name: key,
				},
				authz,
			},
		];
	};

	createListSet = (
		oid: ObjectIdentifier,
		index: number,
		value: any,
		authz?: string,
	): Operation[] => {
		if (this.isPrimitive(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-set',
						index,
						value,
					},
					authz,
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				...initialToPatches(
					value,
					itemOid,
					this.getNow,
					this.createSubId,
					undefined,
					{
						authz,
					},
				),
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-set',
						index,
						value: createRef(itemOid),
					},
					authz,
				},
			];
		}
	};

	createListPush = (
		oid: ObjectIdentifier,
		value: any,
		authz?: string,
	): Operation[] => {
		if (this.isPrimitive(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-push',
						value,
					},
					authz,
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				...initialToPatches(value, itemOid, this.getNow, undefined, undefined, {
					authz,
				}),
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-push',
						value: createRef(itemOid),
					},
					authz,
				},
			];
		}
	};

	createListAdd = (
		oid: ObjectIdentifier,
		value: any,
		authz?: string,
	): Operation[] => {
		if (!this.isPrimitive(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-add',
						value: createRef(value),
					},
					authz,
				},
			];
		} else {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-add',
						value,
					},
					authz,
				},
			];
		}
	};

	createListInsert = (
		oid: ObjectIdentifier,
		index: number,
		value: any,
		authz?: string,
	): Operation[] => {
		if (this.isPrimitive(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-insert',
						value,
						index,
					},
					authz,
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				...initialToPatches(value, itemOid, this.getNow, undefined, undefined, {
					authz,
				}),
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-insert',
						value: createRef(itemOid),
						index,
					},
					authz,
				},
			];
		}
	};

	createListRemove = (
		oid: ObjectIdentifier,
		value: any,
		only?: 'first' | 'last',
		authz?: string,
	): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'list-remove',
					value,
					only,
				},
				authz,
			},
		];
	};

	createListDelete = (
		oid: ObjectIdentifier,
		index: number,
		count: number = 1,
		authz?: string,
	): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'list-delete',
					index,
					count,
				},
				authz,
			},
		];
	};

	createListMoveByRef = (
		oid: ObjectIdentifier,
		value: ObjectRef | FileRef,
		index: number,
		authz?: string,
	): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'list-move-by-ref',
					value,
					index,
				},
				authz,
			},
		];
	};

	createListMoveByIndex = (
		oid: ObjectIdentifier,
		fromIndex: number,
		toIndex: number,
		authz?: string,
	): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'list-move-by-index',
					from: fromIndex,
					to: toIndex,
				},
				authz,
			},
		];
	};

	createDelete = (oid: ObjectIdentifier, authz?: string): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'delete',
				},
				authz,
			},
		];
	};

	createDeleteAll = (
		oids: ObjectIdentifier[],
		authz?: AuthorizationKey,
	): Operation[] => {
		return oids.map((oid) => ({
			oid,
			timestamp: this.getNow(),
			data: {
				op: 'delete',
			},
			authz,
		}));
	};
}
