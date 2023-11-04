/**
 * Builds a type definition for a given type.
 */
export function interfaceBuilder(name: string) {
	const fields: { [key: string]: string } = {};
	return {
		withField(key: string, type: string) {
			fields[key] = type;
			return this;
		},
		withFields(fields: [string, string][]) {
			for (const [key, type] of fields) {
				this.withField(key, type);
			}
			return this;
		},
		build(external = true) {
			return `${external ? 'export ' : ''}interface ${name} {${Object.entries(
				fields,
			)
				.map(([key, type]) => `${key}: ${type};`)
				.join('\n')}}`;
		},
	};
}

export function aliasBuilder(name: string, type: string) {
	return {
		build(external = true) {
			return `${external ? 'export ' : ''}type ${name} = ${type};`;
		},
	};
}
