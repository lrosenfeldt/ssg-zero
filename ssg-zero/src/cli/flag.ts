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
      const line = this.formatFlagSchema(name)
			lines.push(line);
      aliasesColumnLength = Math.max(line[0].length, aliasesColumnLength);
		}

		const optionsUsage = lines
			.map(
				([aliases, description]) =>
					'  ' +
					aliases.padEnd(aliasesColumnLength, ' ') +
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

	private formatFlagSchema(
		name: string,
	): [aliases: string, description: string] {
    const schema = this.schema[name];
    // aliases
    const shortPrefix = schema.short ? `-${schema.short}, ` : '    ';
    const typeSuffix = schema.valueType === null ? '' : ` <${schema.valueType.name}>`;
    // description
		let defaultSuffix = '';
		if (schema.default !== undefined) {
			defaultSuffix =
				typeof schema.default === 'string'
					? ` (default "${schema.default}")`
					: ` (default ${schema.default})`;
		}
		const description = `${schema.description ?? ''}${defaultSuffix}`;
		return [shortPrefix + `--${name}` + typeSuffix, description];
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

export const stringType: FlagType = function string(value) {
	return value;
};
