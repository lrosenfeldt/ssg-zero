import { toKebabCase, toPascalCase } from './util/string.js';

type Clearify<T> = { [K in keyof T]: T[K] } & {};
type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

type FlagParser = (value: string) => any;

type FlagSchema = {
	parse: FlagParser | null;
	setValue: (target: object, value: any) => void;
	short?: string;
	default?: any;
};

class Schema {
	private schema: Record<string, FlagSchema> = {};

	find(name: string): FlagSchema | undefined {
		if (Object.hasOwn(this.schema, name)) {
			return this.schema[name];
		}
		return undefined;
	}

	findByShort(short: string): FlagSchema | undefined {
		return Object.values(this.schema).find(
			s => s.short !== undefined && s.short === short,
		);
	}

	insert(name: string, flagSchema: FlagSchema): void {
		this.schema[name] = flagSchema;
	}
}

const register = new WeakSet<Function>();

const kCommands = Symbol('description');
const kDescription = Symbol('description');
const kInjectCommand = Symbol('inject-command');
const kInjectPositionals = Symbol('inject-positionals');
const kSchema = Symbol('schema');
const kRoot = Symbol('root');

type Meta<Cli extends object = object> = (new () => Cli) & {
	[kRoot]: boolean;
	[kCommands]: Meta[];
	[kDescription]: string;
	[kInjectCommand]: ((target: object, command: object) => void) | undefined;
	[kInjectPositionals]: ((target: object, arg: string[]) => void) | undefined;
	[kSchema]: Schema;
};

export function cli(config: {
	desc: string;
}): (
	value: new () => object,
	context: ClassDecoratorContext<new () => object>,
) => void {
	return function cliDecorator(value, context) {
		if (register.has(value)) {
			throw new Error(
				`Tried to register cli '${value.name}' multiple times. Use '@cli' only once on a class.`,
			);
		}
		register.add(value);
		(value as Meta)[kRoot] = true;
		(value as Meta)[kCommands] = [];
		(value as Meta)[kDescription] = config.desc;
		(value as Meta)[kInjectCommand] = undefined;
		(value as Meta)[kInjectPositionals] = undefined;
		(value as Meta)[kSchema] = new Schema();
		context.addInitializer(function () {
			// ensure an instance is constructed to populate schema
			new value();
			const needsCheck = (value as Meta)[kCommands];
			for (const commandMeta of needsCheck) {
				new commandMeta();
				needsCheck.push(...commandMeta[kCommands]);
			}
			// add any sanity checks here if needed
			// for now the defaults are fine if the user doesn't provide anything
		});
	};
}

export function command(config: {
	desc: string;
}): (
	value: new () => object,
	context: ClassDecoratorContext<new () => object>,
) => void {
	return function commandDecorator(value) {
		if (register.has(value)) {
			throw new Error(
				`Tried to register command '${value.name}' multiple times. Use '@command' only once on a class.`,
			);
		}
		register.add(value);
		(value as Meta)[kRoot] = false;
		(value as Meta)[kCommands] = [];
		(value as Meta)[kDescription] = config.desc;
		(value as Meta)[kInjectCommand] = undefined;
		(value as Meta)[kInjectPositionals] = undefined;
		(value as Meta)[kSchema] = new Schema();
	};
}

export function subcommand<
	Command extends object,
	Ctor extends new () => Command,
>(
	cmds: Ctor[],
): (
	value: undefined,
	context: ClassFieldDecoratorContext<object, Command | undefined>,
) => (this: object, initial: Command | undefined) => undefined {
	return function subommandDecorator(_, context) {
		const name =
			typeof context.name === 'string'
				? toPascalCase(context.name)
				: context.name.toString();
		return setFunctionName(`onInit${name}AsCommandField`, function () {
			if (!register.has(this.constructor)) {
				throw new Error(
					`Tried to add subcommand to unregistered command ${this.constructor.name}. Use '@command' to register the command first.`,
				);
			}
			(this.constructor as Meta)[kCommands] = cmds as any[];
			(this.constructor as Meta)[kInjectCommand] = context.access
				.set as any;
			return undefined;
		});
	};
}

export function positionals(): (
	value: undefined,
	context: ClassFieldDecoratorContext<object, string[] | undefined>,
) => (this: object, initial: string[] | undefined) => string[] | undefined {
	return function positionalsDecorator(_, context) {
		const name =
			typeof context.name === 'string'
				? toPascalCase(context.name)
				: context.name.toString();
		return setFunctionName(
			`onInit${name}AsPositionalsField`,
			function (initial) {
				if (!register.has(this.constructor)) {
					throw new Error(
						`Tried to allow positionals on unregistered command ${this.constructor.name}. Use '@command' to register the command first.`,
					);
				}
				(this.constructor as Meta)[kInjectPositionals] =
					context.access.set;
				return initial;
			},
		);
	};
}

type FlagConfig = Clearify<Omit<FlagSchema, 'default' | 'parse' | 'setValue'>>;
function typedFlag<BaseValue>(
	parse: FlagSchema['parse'],
	config: FlagConfig,
): <Value extends BaseValue>(
	value: undefined,
	context: ClassNamedFieldDecoratorContext<object, Value>,
) => (this: object, initial: Value) => Value {
	const typeName = parse !== null ? parse.name : 'boolean';
	return setFunctionName(`${typeName}FlagDecorator`, function (_, context) {
		return setFunctionName(
			`onInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`,
			function (initial) {
				if (!register.has(this.constructor)) {
					throw new Error(
						`Tried to add flag on unregistered command ${this.constructor.name}. Use '@command' to register the command first.`,
					);
				}
				const schema: Schema = (this.constructor as Meta)[kSchema];

				schema.insert(
					toKebabCase(context.name),
					Object.assign<
						FlagConfig,
						Pick<FlagSchema, 'default' | 'parse' | 'setValue'>
					>(config, {
						default: initial,
						parse,
						setValue: context.access.set,
					}),
				);

				return initial;
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
			throw new Error(`Given '${value}' is not a valid number`);
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

function setFunctionName<Fn extends Function>(name: string, fn: Fn): Fn {
	return Object.defineProperty(fn, 'name', {
		configurable: true,
		enumerable: false,
		writable: false,
		value: name,
	});
}

export class Parser<Cli extends object> {
	static fromCli<Cli extends object>(
		args: string[],
		cli: new () => Cli,
	): Parser<Cli> {
		this.assertIsCliMeta(cli);
		return new Parser(args, cli);
	}

	private static assertIsCliMeta<Cli extends object>(
		target: new () => Cli,
	): asserts target is Meta<Cli> {
		if (!Object.hasOwn(target, kRoot)) {
			throw new Error(
				`Can't use arbitrary class '${target.name}' as cli definition.`,
			);
		}

		if (!(target as Meta<Cli>)[kRoot]) {
			throw new Error(
				`Tried to use command '${target.name}' as cli. Use the '@cli' decorator on the class.`,
			);
		}
	}

	// parser state
	private args: string[];
	private arg: string = '\0';
	private position: number = 0;
	private reachedPositionals: boolean = false;

	// parsed result and related
	private options: Cli;
	private activeMeta: Meta;
	private activeOptions: object;

	constructor(args: string[], cliMeta: Meta<Cli>) {
		this.args = args;
		this.nextArg();

		this.options = new cliMeta();
		this.activeMeta = cliMeta;
		this.activeOptions = this.options;
	}

	parse(): Cli {
		for (; this.arg !== '\0'; this.nextArg()) {
			if (this.reachedPositionals) {
				break;
			} else if (this.arg === '--') {
				this.reachedPositionals = true;
			} else if (this.arg.startsWith('--') && this.arg.includes('=')) {
				this.parseInlineValue();
			} else if (this.arg.startsWith('--')) {
				this.parseLongOption();
			} else if (this.arg.startsWith('-') && this.arg.length === 2) {
				this.parseShortOption();
			} else if (this.arg.startsWith('-') && this.arg.length > 2) {
				this.parseShortOptionGroup();
			} else if (this.needsCommand()) {
				this.parseCommand();
			} else {
				this.reachedPositionals = true;
				break;
			}
		}

		if (this.arg !== '\0' && this.reachedPositionals) {
			this.parsePositionals();
		}

		return this.options;
	}

	private needsCommand(): boolean {
		return this.activeMeta[kInjectCommand] !== undefined;
	}

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}
		this.arg = this.args[this.position++];
	}

	private parseCommand(): void {
		const commandMeta = this.activeMeta[kCommands].find(
			command => this.arg === toKebabCase(command.name),
		);
		if (commandMeta === undefined) {
			throw new Error(`Found unknown command '${this.arg}'`);
		}

		const command = new commandMeta();
		this.activeMeta[kInjectCommand]!(this.activeOptions, command);

		this.activeMeta = commandMeta;
		this.activeOptions = command;
	}

	private parseInlineValue(): void {
		const indexOfEqualSign = this.arg.indexOf('=');
		const argName = this.arg.slice(2, indexOfEqualSign);

		const schema = this.activeMeta[kSchema].find(argName);
		if (schema === undefined) {
			throw new Error(
				`Tried to set value for unknown option '--${argName}'`,
			);
		}

		if (schema.parse === null) {
			throw new Error(`Got unexpected value for '--${argName}'`);
		}
		const value = this.arg.slice(indexOfEqualSign + 1);
		const parsed = schema.parse(value);
		schema.setValue(this.activeOptions, parsed);
	}

	private parseLongOption(): void {
		const argName = this.arg.slice(2);

		const schema = this.activeMeta[kSchema].find(argName);
		if (schema === undefined) {
			throw new Error(`Found unknown option '--${argName}'`);
		}

		if (schema.parse === null) {
			schema.setValue(this.activeOptions, true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '--${argName}' but reached end of arguments`,
			);
		}
		const value = this.arg;
		const parsed = schema.parse(value);
		schema.setValue(this.activeOptions, parsed);
	}

	private parsePositionals(): void {
		const inject = this.activeMeta[kInjectPositionals];
		if (inject === undefined) {
			throw new Error(`Got unexpected positional '${this.arg}'`);
		}

		const rest = this.args.slice(this.position - 1);
		inject(this.activeOptions, rest);
	}

	private parseShortOption(): void {
		const short = this.arg[1];

		const schema = this.activeMeta[kSchema].findByShort(short);
		if (schema === undefined) {
			throw new Error(`Found unknown alias '-${short}'`);
		}

		if (schema.parse === null) {
			schema.setValue(this.activeOptions, true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '-${short}' but reached end of arguments`,
			);
		}
		const value = this.arg;
		const parsed = schema.parse(value);
		schema.setValue(this.activeOptions, parsed);
	}

	private parseShortOptionGroup(): void {
		const group = this.arg.slice(1);
		for (let i = 0, char = group[i]; i < group.length; char = group[++i]) {
			const schema = this.activeMeta[kSchema].findByShort(char);
			if (schema === undefined) {
				throw new Error(
					`Found invalid group '-${group}', contains unknown alias '-${char}'`,
				);
			}

			if (schema.parse === null) {
				schema.setValue(this.activeOptions, true);
				continue;
			}

			// still in group
			// use rest as value: -f => Config.json
			if (i < group.length - 1) {
				const value = group.slice(i + 1);
				const parsed = schema.parse(value);
				schema.setValue(this.activeOptions, parsed);
				break;
			}

			this.nextArg();
			if (this.arg === '\0') {
				throw new Error(
					`Expected value for '-${char}' at end of '-${group}' but reached end of arguments`,
				);
			}
			const value = this.arg;
			const parsed = schema.parse(value);
			schema.setValue(this.activeOptions, parsed);
		}
	}
}

export function parse<Cli extends object>(
	cli: new () => Cli,
	args: string[],
): Cli {
	const parser = Parser.fromCli(args, cli);
	return parser.parse();
}
