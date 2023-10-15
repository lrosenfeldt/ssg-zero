import { toKebabCase, toPascalCase } from '../util/string.js';

type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

type Clearify<T> = { [K in keyof T]: T[K] } & {};

export type FlagType = (value: string) => any;

export type FlagSchema = {
	valueType: FlagType | null;
	short?: string;
	description?: string;
	default?: any;
};

type FlagConfig = Clearify<Omit<FlagSchema, 'valueType' | 'default'>>;

export class Command {
	private schema: Record<string, FlagSchema> = {};

	private get name() {
		// pascal case to kebab-case
		return toKebabCase(this.constructor.name);
	}

	constructor(private description: string) {}

	usage(appName: string): string {
		// format options
		const lines: Array<[alias: string, description: string]> = [];
		let aliasesColumnLength = 0;
		for (const name in this.schema) {
			const line = this.formatFlagSchema(name);
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
Usage: ${appName} ${this.name} [OPTIONS]
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
		const typeSuffix =
			schema.valueType === null ? '' : ` <${schema.valueType.name}>`;
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

export function typedFlag<BaseValue>(
	flagType: FlagSchema['valueType'],
	config: FlagConfig,
): <This extends Command, Value extends BaseValue>(
	value: undefined,
	context: ClassNamedFieldDecoratorContext<This, Value>,
) => ((this: This, value: Value) => Value) | void {
	const typeName = flagType === null ? 'boolean' : flagType.name;

	function decorator<This extends Command, Value extends BaseValue>(
		_: undefined,
		context: ClassNamedFieldDecoratorContext<This, Value>,
	) {
		const flagName = toKebabCase(context.name);
		function onBeforeInit(this: This): void {
			this['schema'][flagName] = Object.assign<
				FlagConfig,
				Pick<FlagSchema, 'valueType'>
			>(config, { valueType: flagType });
		}

		setFunctionName(
			onBeforeInit,
			`onBeforeInit${toPascalCase(context.name)}As${toPascalCase(
				typeName,
			)}`,
		);

		context.addInitializer(onBeforeInit);

		function onInit(this: This, value: Value) {
			if (value !== undefined) {
				this['schema'][flagName].default = value;
			}
			return value;
		}

		setFunctionName(
			onInit,
			`onInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`,
		);

		return onInit;
	}

	setFunctionName(decorator, `${typeName}FlagDecorator`);

	return decorator;
}

export const boolean = (typedFlag<boolean | undefined>).bind(null, null);
export const number = (typedFlag<number | undefined>).bind(
	null,
	function number(value) {
		if (value.toLowerCase() === 'NaN') {
			return NaN;
		}
		const asNumber = Number(value);
		if (Number.isNaN(asNumber)) {
			return new Error(`Given '${value}' is not a valid number`);
		}
		return asNumber;
	},
);
export const string = (typedFlag<string | undefined>).bind(
	null,
	function string(value) {
		return value;
	},
);

function setFunctionName(fn: Function, name: string): void {
	Object.defineProperty(fn, 'name', {
		enumerable: false,
		writable: false,
		configurable: true,
		value: name,
	});
}
