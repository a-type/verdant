/**
 * High-level patch creation for use with complex nested objects.
 */

import { createRef, createSubOid, ObjectIdentifier } from './oids.js';
import {
	diffToPatches,
	initialToPatches,
	ObjectRef,
	Operation,
	PropertyName,
} from './operation.js';
import { isObject } from './utils.js';

export class PatchCreator {
	constructor(
		private getNow: () => string,
		private createSubId?: () => string,
	) {}

	createDiff = (from: any, to: any) => {
		return diffToPatches(from, to, this.getNow, this.createSubId);
	};

	createInitialize = (obj: any, oid: ObjectIdentifier) => {
		return initialToPatches(obj, oid, this.getNow, this.createSubId);
	};

	createSet = (
		oid: ObjectIdentifier,
		key: PropertyName,
		value: any,
	): Operation[] => {
		// incoming value must be normalized. if it's not a primitive, it and all sub-objects
		// must be created
		if (!isObject(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'set',
						name: key,
						value,
					},
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				// since we're setting a complex nested object, we can initialize it wholesale.
				// no diffing to do.
				...initialToPatches(value, itemOid, this.getNow),
				// then set the reference to the object
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'set',
						value: createRef(itemOid),
						name: key,
					},
				},
			];
		}
	};

	createRemove = (oid: ObjectIdentifier, key: PropertyName): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'remove',
					name: key,
				},
			},
		];
	};

	createListPush = (oid: ObjectIdentifier, value: any): Operation[] => {
		if (!isObject(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-push',
						value,
					},
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				...initialToPatches(value, itemOid, this.getNow),
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-push',
						value: createRef(itemOid),
					},
				},
			];
		}
	};

	createListInsert = (
		oid: ObjectIdentifier,
		index: number,
		value: any,
	): Operation[] => {
		if (!isObject(value)) {
			return [
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-insert',
						value,
						index,
					},
				},
			];
		} else {
			const itemOid = createSubOid(oid, this.createSubId);
			return [
				...initialToPatches(value, itemOid, this.getNow),
				{
					oid,
					timestamp: this.getNow(),
					data: {
						op: 'list-insert',
						value: createRef(itemOid),
						index,
					},
				},
			];
		}
	};

	createListRemove = (oid: ObjectIdentifier, value: any): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'list-remove',
					value,
				},
			},
		];
	};

	createListDelete = (
		oid: ObjectIdentifier,
		index: number,
		count: number = 1,
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
			},
		];
	};

	createListMoveByRef = (
		oid: ObjectIdentifier,
		value: ObjectRef,
		index: number,
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
			},
		];
	};

	createListMoveByIndex = (
		oid: ObjectIdentifier,
		fromIndex: number,
		toIndex: number,
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
			},
		];
	};

	createDelete = (oid: ObjectIdentifier): Operation[] => {
		return [
			{
				oid,
				timestamp: this.getNow(),
				data: {
					op: 'delete',
				},
			},
		];
	};
}
