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
 */
export function getObjectProperty(obj, name) {
	return (
		obj.properties.find((prop) => prop.key.value === name)?.value ?? undefined
	);
}
