import schema from '../schema.ts';console.log(
		JSON.stringify(
			schema,
			// convert all functions to "FUNCTION"
			(key, value) => (typeof value === 'function' ? 'FUNCTION' : value),
		)
	); process.exit(0);