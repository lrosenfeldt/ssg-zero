export function capitalize(str: string): string {
	if (str === '') {
		return str;
	}
	return str[0].toUpperCase() + str.slice(1);
}

export function toPascalCase(str: string): string {
	if (str === '') {
		return str;
	}
	let pascalCased = str[0].toUpperCase();
	for (let i = 1, char = str[i]; i < str.length; char = str[++i]) {
		if (i === str.length - 1) {
			pascalCased += char.toLowerCase();
		} else if (char === '_' || char === '-') {
			pascalCased += str[++i].toUpperCase();
		} else {
			pascalCased += char;
		}
	}
	return pascalCased;
}

export function toKebabCase(str: string): string {
	if (str === '') {
		return str;
	}
	let kebabCased = str[0].toLowerCase();
	for (let i = 1, char = str[i]; i < str.length; char = str[++i]) {
		if (i === str.length - 1) {
			kebabCased += char.toLowerCase();
		} else if (char === '_') {
			kebabCased += '-' + str[++i].toLowerCase();
		} else if (char.match(/^[A-Z]$/)) {
			kebabCased += '-' + char.toLowerCase();
		} else {
			kebabCased += char;
		}
	}
	return kebabCased;
}
