export const jsonDecycle = `
/*
    cycle.js
    2021-05-31

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    This code should be minified before deployment.
    See https://www.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

// The file uses the WeakMap feature of ES6.

/*property
    $ref, decycle, forEach, get, indexOf, isArray, keys, length, push,
    retrocycle, set, stringify, test
*/

    function decycle(object, replacer) {
        "use strict";
        var objects = new WeakMap();
        return (function derez(value, path) {
            var old_path;   // The path of an earlier occurance of value
            var nu;         // The new object or array

            if (replacer !== undefined) {
                value = replacer(value);
            }

            if (
                typeof value === "object"
                && value !== null
                && !(value instanceof Boolean)
                && !(value instanceof Date)
                && !(value instanceof Number)
                && !(value instanceof RegExp)
                && !(value instanceof String)
            ) {
                old_path = objects.get(value);
                if (old_path !== undefined) {
                    return {$ref: old_path};
                }
                objects.set(value, path);
                if (Array.isArray(value)) {
                    nu = [];
                    value.forEach(function (element, i) {
                        nu[i] = derez(element, path + "[" + i + "]");
                    });
                } else {
                    nu = {};
                    Object.keys(value).forEach(function (name) {
                        nu[name] = derez(
                            value[name],
                            path + "[" + JSON.stringify(name) + "]"
                        );
                    });
                }
                return nu;
            }
            return value;
        }(object, "$"));
    };
`;

export function retrocycle<T = any>(decycled: T): T {
	// Restore an object that was reduced by decycle. Members whose values are
	// objects of the form
	//      {$ref: PATH}
	// are replaced with references to the value found by the PATH. This will
	// restore cycles. The object will be mutated.

	// So,
	//      var s = '[{"$ref":"$"}]';
	//      return JSON.retrocycle(JSON.parse(s));
	// produces an array containing a single element which is the array itself.

	function getByPath(path: string) {
		if (path === '$') {
			return decycled;
		}
		var parts = path.split('[');
		parts.shift();
		parts.forEach(function (part, i) {
			parts[i] = part.slice(0, -1);
			parts[i] = JSON.parse(parts[i]);
		});
		return parts.reduce((acc, part) => {
			return acc[part];
		}, decycled as any);
	}

	(function rez(value: any) {
		// The rez function walks recursively through the object looking for $ref
		// properties. When it finds one that has a value that is a path, then it
		// replaces the $ref object with a reference to the value that is found by
		// the path.

		if (value && typeof value === 'object') {
			if (Array.isArray(value)) {
				value.forEach(function (element, i) {
					if (typeof element === 'object' && element !== null) {
						var path = element.$ref;
						if (typeof path === 'string') {
							value[i] = getByPath(path);
						} else {
							rez(element);
						}
					}
				});
			} else {
				Object.keys(value).forEach(function (name) {
					var item = value[name];
					if (typeof item === 'object' && item !== null) {
						var path = item.$ref;
						if (typeof path === 'string') {
							value[name] = getByPath(path);
						} else {
							rez(item);
						}
					}
				});
			}
		}
	})(decycled);
	return decycled;
}
