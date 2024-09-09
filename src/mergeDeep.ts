function isObject(item: unknown): item is Record<string, unknown> {
	return item != null && item.constructor.name === "Object";
}

export function mergeDeep(target: unknown, ...sources: unknown[]) {
	if (!sources.length) {
		return target;
	}

	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) {
					Object.assign(target, { [key]: {} });
				}
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}
