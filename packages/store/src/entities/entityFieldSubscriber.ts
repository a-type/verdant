import { Entity } from './Entity.js';
import { EntityChangeInfo } from './types.js';

export function entityFieldSubscriber<T = any>(
	entity: Entity,
	field: string | number | symbol,
	subscriber: (
		newValue: T,
		info: EntityChangeInfo & { previousValue: T },
	) => void,
) {
	const valueHolder = {
		previousValue: entity.get(field),
		isLocal: false,
	};
	function handler(
		this: { previousValue: T } & EntityChangeInfo,
		info: EntityChangeInfo,
	) {
		if (entity.deleted) {
			return;
		}
		const newValue = entity.get(field);
		if (newValue !== this.previousValue) {
			this.isLocal = info.isLocal;
			subscriber(newValue, this);
			this.previousValue = newValue;
		}
	}
	return entity.subscribe('change', handler.bind(valueHolder));
}
