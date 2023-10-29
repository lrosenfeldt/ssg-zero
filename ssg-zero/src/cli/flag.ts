import { toKebabCase, toPascalCase } from '../util/string.js';

type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

type Clearify<T> = { [K in keyof T]: T[K] } & {};

export type FlagType = (value: string) => any;

export type FlagSchema = {
	valueType: FlagType | null;
	key: string;
	short?: string;
	description?: string;
	default?: any;
};

export type FlagConfig = Clearify<
	Omit<FlagSchema, 'valueType' | 'default' | 'key'>
>;

export type Schema = Record<string, FlagSchema>;

const commandsKey = Symbol('commands');
const descriptionKey = Symbol('description');
const schemaKey = Symbol('schema');
const versionKey = Symbol('version');

export type CommandMeta = (new () => any) & {
	[descriptionKey]: string;
	[schemaKey]: Schema;
};

export type Command = Record<string, any> & {
	constructor: CommandMeta;
};

export type AppMeta = (new () => any) & {
	[commandsKey]: Command[];
	[descriptionKey]: string;
	[schemaKey]: Schema;
	[versionKey]: string;
};

export type App = Record<string, any> & { constructor: AppMeta };

export function commands<Commands>(
	cmds: Commands[],
): (
	value: undefined,
	context: ClassFieldDecoratorContext<object, Commands | undefined>,
) => (this: object, initialValue: Commands | undefined) => undefined {
	return function commandsDecorator(_, context) {
		return setFunctionName(
			`onInit${context.name.toString()}AsCommandField`,
			function () {
				(this.constructor as any)[commandsKey] = cmds;
				return undefined;
			},
		);
	};
}

export function version(
	vers: string,
): (value: any, context: ClassDecoratorContext) => void {
	return function versionDecorator(value) {
		value[versionKey] = vers;
	};
}

export function description(
	desc: string,
): (value: any, context: ClassDecoratorContext) => void {
	return function descriptionDecorator(value) {
		value[descriptionKey] = desc;
	};
}

export function typedFlag<BaseValue>(
	flagType: FlagSchema['valueType'],
	config: FlagConfig,
): <Value extends BaseValue>(
	value: undefined,
	context: ClassNamedFieldDecoratorContext<object, Value>,
) => (this: object, initialValue: Value) => Value {
	const typeName = flagType !== null ? flagType.name : 'boolean';
	return setFunctionName(`${typeName}FlagDecorator`, function (_, context) {
		return setFunctionName(
			`onInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`,
			function (initialValue) {
				let schema: Schema;
				if (Object.hasOwn(this.constructor, schemaKey)) {
					schema = (this.constructor as any)[schemaKey];
				} else {
					schema = {};
					(this.constructor as any)[schemaKey] = schema;
				}
				schema[toKebabCase(context.name)] = Object.assign<
					FlagConfig,
					Pick<FlagSchema, 'default' | 'valueType' | 'key'>
				>(config, {
					default: initialValue,
					valueType: flagType,
					key: context.name,
				});
				return initialValue;
			},
		);
	});
}

export const boolean = (typedFlag<boolean | undefined>).bind(null, null);

export const number = (typedFlag<number | undefined>).bind(
	null,
	function number(value) {
		if (value.toLowerCase() === 'nan') {
			return NaN;
		}
		const asNumber = Number(value);
		if (Number.isNaN(asNumber)) {
			return Error(`Given '${value}' is not a valid number`);
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

export class SchemaRegistry {
	private static isApp(target: object): target is App {
		if (!this.isCommand(target)) {
			return false;
		}
		const meta = target.constructor;
		return (
			Object.hasOwn(meta, commandsKey) &&
			Array.isArray((meta as any)[commandsKey]) &&
			(meta as any)[commandsKey].every(SchemaRegistry.isCommand)
		);
	}

	private static isCommand(target: object): target is Command {
		return (
			Object.hasOwn(target.constructor, descriptionKey) &&
			typeof (target.constructor as any)[descriptionKey] === 'string' &&
			Object.hasOwn(target.constructor, schemaKey) &&
			typeof (target.constructor as any)[schemaKey] === 'object'
		);
	}

	static fromApp(app: object): SchemaRegistry {
		if (!SchemaRegistry.isApp(app)) {
			throw new Error(
				`Cannot construct schema registry from invalid app definition`,
			);
		}

		return new SchemaRegistry(
			app.constructor[schemaKey],
			app.constructor[commandsKey],
		);
	}

	private constructor(
		private globals: Schema,
		private commands: Command[],
	) {}

	isCommand(name: string): boolean {
		return this.findCommandMeta(name) !== undefined;
	}

	find(name: string, command?: string): FlagSchema | undefined {
		if (command !== undefined) {
			const schema = this.strictFind(name, command);
			if (schema !== undefined) return schema;
		}

		if (Object.hasOwn(this.globals, name)) {
			return this.globals[name];
		}

		return undefined;
	}

	findCommandMeta(name: string): CommandMeta | undefined {
		const command = this.commands.find(
			cmd => toKebabCase(cmd.constructor.name) === name,
		);
		if (command === undefined) {
			return undefined;
		}

		return command.constructor;
	}

	findEntryByShort(
		short: string,
		command?: string,
	): [name: string, schema: FlagSchema] | undefined {
		if (command !== undefined) {
			const entry = this.strictFindEntryByShort(short, command);
			if (entry !== undefined) return entry;
		}

		return Object.entries(this.globals).find(
			([, s]) => s.short && s.short === short,
		);
	}

	strictFind(name: string, command: string): FlagSchema | undefined {
		const meta = this.findCommandMeta(command);
		if (meta !== undefined && Object.hasOwn(meta[schemaKey], name)) {
			return meta[schemaKey][name];
		}
		return undefined;
	}

	strictFindEntryByShort(
		short: string,
		command: string,
	): [name: string, schema: FlagSchema] | undefined {
		const meta = this.findCommandMeta(command);

		if (meta !== undefined) {
			return Object.entries(meta[schemaKey]).find(
				([, s]) => s.short && s.short === short,
			);
		}

		return undefined;
	}
}

function optionsUsage(fullSchema: Schema): string {
	let lines: Array<[aliases: string, description: string]> = [];
	let aliasesColumnLength = 0;

	for (const name in fullSchema) {
		const schema = fullSchema[name];

		const typeSuffix =
			schema.valueType !== null ? ` <${schema.valueType.name}>` : '';
		const aliases = `${
			schema.short ? `-${schema.short}, ` : '    '
		}--${name}${typeSuffix}`;
		aliasesColumnLength = Math.max(aliasesColumnLength, aliases.length);

		let defaultSuffix: string;
		if (schema.default !== undefined) {
			defaultSuffix =
				typeof schema.default === 'string'
					? ` (default "${schema.default}")`
					: ` (default ${schema.default})`;
		} else {
			defaultSuffix = '';
		}
		const description = `${schema.description}${defaultSuffix}`;

		lines.push([aliases, description]);
	}

	return lines
		.map(
			([aliases, description]) =>
				'  ' +
				aliases.padEnd(aliasesColumnLength, ' ') +
				'  ' +
				description,
		)
		.join('\n');
}

export function appUsage(app: App): string {
	const appMeta = app.constructor;

	const lines: Array<[aliases: string, description: string]> = [];
	let aliasesColumnLength = 0;
	for (const command of appMeta[commandsKey]) {
		const commandMeta = command.constructor;
		const commandName = toKebabCase(commandMeta.name);
		aliasesColumnLength = Math.max(aliasesColumnLength, commandName.length);
		lines.push([commandName, commandMeta[descriptionKey]]);
	}

	const commandList = lines
		.map(
			([aliases, description]) =>
				'  ' +
				aliases.padEnd(aliasesColumnLength, ' ') +
				'  ' +
				description,
		)
		.join('\n');

	return `\
Usage: ${toKebabCase(appMeta.name)} [GLOBAL_OPTIONS] <command>
${appMeta[descriptionKey]}

Commands:
${commandList}

Global Options:
${optionsUsage(appMeta[schemaKey])}
`;
}

export function commandUsage(command: Command): string {
	const commandMeta = command.constructor;

	return `\
Usage: ssg-zero ${toKebabCase(commandMeta.name)} [OPTIONS]
${commandMeta[descriptionKey]}

Options:
${optionsUsage(commandMeta[schemaKey])}
`;
}

function setFunctionName<Fn extends Function>(name: string, fn: Fn): Fn {
	return Object.defineProperty(fn, 'name', {
		configurable: true,
		enumerable: false,
		writable: false,
		value: name,
	});
}
