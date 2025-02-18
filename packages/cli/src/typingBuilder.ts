/**
 * Builds a type definition for a given type.
 */
export function interfaceBuilder(name: string) {
	const builderFields: {
		[key: string]: {
			type: string;
			nullable: boolean;
			optional: boolean;
		};
	} = {};
	return {
		withField({
			key,
			type,
			nullable,
			optional,
		}: {
			key: string;
			type: string;
			nullable?: boolean;
			optional?: boolean;
		}) {
			builderFields[key] = {
				type,
				nullable: !!nullable,
				optional: !!optional,
			};
			return this;
		},
		build(external = true) {
			return `${external ? 'export ' : ''}interface ${name} {${Object.entries(
				builderFields,
			)
				.map(
					([key, { type, optional, nullable }]) =>
						`${key}${optional ? '?' : ''}: ${type}${
							nullable ? ' | null' : ''
						};`,
				)
				.join('\n')}}`;
		},
	};
}

export function aliasBuilder(name: string, type: string, doc?: string) {
	let wrapper = '';
	return {
		nullable(isNullable: boolean) {
			if (isNullable) {
				type = `${type} | null`;
			}
			return this;
		},
		wrap(wrapperType: string) {
			wrapper = wrapperType;
			return this;
		},
		build(external = true) {
			return `${doc ? `/** ${doc} */\n` : ''}${
				external ? 'export ' : ''
			}type ${name} = ${wrapper ? `${wrapper}<` : ''}${type}${
				wrapper ? '>' : ''
			};`;
		},
	};
}

export function recordBuilder() {
	const fields = new Array<{
		key: string;
		type: string;
		optional: boolean;
		nullable: boolean;
	}>();
	return {
		withField({
			key,
			type,
			optional,
			nullable,
		}: {
			key: string;
			type: string;
			optional?: boolean;
			nullable?: boolean;
		}) {
			fields.push({
				key,
				type,
				optional: !!optional,
				nullable: !!nullable,
			});
			return this;
		},
		build() {
			return `{${fields
				.map(
					({ key, type, optional, nullable }) =>
						`${key}${optional ? '?' : ''}: ${type}${nullable ? ' | null' : ''}`,
				)
				.join(', ')}}`;
		},
	};
}

export function arrayBuilder(type: string) {
	return {
		build() {
			return `${type}[]`;
		},
	};
}
