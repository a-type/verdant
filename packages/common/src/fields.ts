export interface StaticField<T> {
	type: 'static';
	default?: T;
}

export function createStaticField<T>(value: T): StaticField<T> {
	return {
		type: 'static',
		default: value,
	};
}

export function isStaticField(field: any): field is StaticField<any> {
	return field.type === 'static';
}
