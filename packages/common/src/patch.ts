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
	shallowInitialToPatches,
} from './operation.js';
import { isRef } from './refs.js';
import { assert, isObject } from './utils.js';

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
		options: {
			mergeUnknownObjects?: boolean;
			/** @deprecated use the equivalent 'merge' */
			defaultUndefined?: boolean;
			merge?: boolean;
			authz?: AuthorizationKey;
		} = {},
	) => {
		return diffToPatches(from, to, this.getNow, this.createSubId, [], options);
	};

	createInitialize = (
		obj: any,
		oid: ObjectIdentifier,
		authz?: AuthorizationKey,
		shallow?: boolean,
	) => {
		if (shallow) {
			return shallowInitialToPatches(
				obj,
				oid,
				this.getNow,
				undefined,
				authz ? { authz } : undefined,
			);
		}
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
		authz?: AuthorizationKey,
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
		authz?: AuthorizationKey,
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
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(index >= 0, 'List index must be non-negative');
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
		authz?: AuthorizationKey,
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
		authz?: AuthorizationKey,
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
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(index >= 0, 'List index must be non-negative');
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
				...initialToPatches(
					value,
					itemOid,
					this.getNow,
					this.createSubId,
					undefined,
					authz
						? {
								authz,
							}
						: undefined,
				),
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

	createListInsertMany = (
		oid: ObjectIdentifier,
		index: number,
		values: any[],
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(index >= 0, 'List index must be non-negative');
		const operations: Operation[] = [];
		const refs = values.map((value) => {
			if (this.isPrimitive(value)) return value;
			const subOid = createSubOid(oid, this.createSubId);
			operations.push(
				...initialToPatches(
					value,
					subOid,
					this.getNow,
					this.createSubId,
					undefined,
					{
						authz,
					},
				),
			);
			return createRef(subOid);
		});
		operations.push({
			oid,
			timestamp: this.getNow(),
			data: {
				op: 'list-insert',
				values: refs,
				index,
			},
			authz,
		});
		return operations;
	};

	createListRemove = (
		oid: ObjectIdentifier,
		value: ObjectRef | FileRef | string | number | boolean | null,
		only?: 'first' | 'last',
		authz?: AuthorizationKey,
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
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(index >= 0, 'List index must be non-negative');
		assert(count > 0, 'Count must be positive and non-zero');
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
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(index >= 0, 'List index must be non-negative');
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
		authz?: AuthorizationKey,
	): Operation[] => {
		assert(fromIndex >= 0, 'List move from index must be non-negative');
		assert(toIndex >= 0, 'List move to index must be non-negative');
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

	createDelete = (
		oid: ObjectIdentifier,
		authz?: AuthorizationKey,
	): Operation[] => {
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
