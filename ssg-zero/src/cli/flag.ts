export type FlagType = (value: string) => any;

export type FlagSchema = {
	valueType: FlagType | null;
	short?: string;
	description?: string;
	default?: any;
};

function toKebabCase(str: string): string {
		let kebabCased = str[0].toLowerCase();
		for (const char of str.slice(1)) {
			if (char === char.toUpperCase()) {
				kebabCased += '-' + char.toLowerCase();
			} else {
				kebabCased += char;
			}
		}
		return kebabCased;
}

export class Command {
	private schema: Record<string, FlagSchema> = {};

	private get name() {
		// pascal case to kebab-case
		return toKebabCase(this.constructor.name);
	}

	constructor(private description: string) {}

	usage(): string {
		// format options
		const lines: Array<[alias: string, description: string]> = [];
		let aliasesColumnLength = 0;
		for (const name in this.schema) {
			const option = this.schema[name];
			const aliases = `${
				option.short ? `-${option.short}, ` : '    '
			}--${name}`;
			aliasesColumnLength = Math.max(aliasesColumnLength, aliases.length);
			let defaultSuffix = '';
			if (option.default !== undefined) {
				defaultSuffix =
					typeof option.default === 'string'
						? ` (default "${option.default}")`
						: ` (default ${option.default})`;
			}
			const description = `${option.description ?? ''}${defaultSuffix}`;
			lines.push([aliases, description]);
		}

		const optionsUsage = lines
			.map(
				([aliases, description]) =>
					'  ' +
					aliases.padStart(aliasesColumnLength, ' ') +
					'  ' +
					description,
			)
			.join('\n');

		return `\
Usage: app ${this.name} [OPTIONS]
${this.description}

Options:
${optionsUsage}
`;
	}
}

export const numberType: FlagType = function number(value) {
	if (value.toLowerCase() === 'NaN') {
		return NaN;
	}
	const asNumber = Number(value);
	if (Number.isNaN(asNumber)) {
		return new Error(`Given '${value}' is not a valid number`);
	}
	return asNumber;
};
