/**
 * @param {import('estree').ObjectExpression} obj
 */
export function objectExpressionEntries(objectExpression) {
	return objectExpression.properties.map((prop) => [
		prop.key.value,
		prop.value,
	]);
}

/**
 * @param {import('estree').ObjectExpression} obj
 * @param {string} name
 * @returns {import('estree').Property['value'] | undefined}
 */
export function getObjectProperty(obj, name) {
	if (!obj.properties) {
		throw new Error(`Cannot get properties of AST node ${JSON.stringify(obj)}`);
	}
	return (
		obj.properties.find((prop) => prop.key.value === name)?.value ?? undefined
	);
}
