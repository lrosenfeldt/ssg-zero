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

const kSchema = Symbol('schema');
const kDescription = Symbol('description');
const kInjectPositionals = Symbol('inject-positionals');

const kCommands = Symbol('description');
const kInjectCommand = Symbol('inject-command');

type CommandMeta = (new () => object) & {
	[kDescription]: string;
	[kInjectPositionals]?: (target: object, arg: string[]) => void;
	[kSchema]: Schema;
};
type CliMeta<Cli extends object> = (new () => Cli) & {
	[kCommands]: CommandMeta[];
	[kInjectCommand]: (target: Cli, command: object) => void;
	[kDescription]: string;
	[kInjectPositionals]?: (target: Cli, command: object) => void;
	[kSchema]: Schema;
};

export function commands<
	Commands extends object,
	Ctor extends new () => Commands,
>(
	...cmds: Ctor[]
): (
	value: undefined,
	context: ClassFieldDecoratorContext<object, Commands | undefined>,
) => (this: object, initial: Commands | undefined) => undefined {
	return function commandsDecorator(_, context) {
		const name =
			typeof context.name === 'string'
				? toPascalCase(context.name)
				: context.name.toString();
		return setFunctionName(
			`onInit${name}AsCommandField`,
			function (this, _) {
				(this.constructor as any)[kCommands] = cmds;
				(this.constructor as any)[kInjectCommand] = context.access.set;
				return undefined;
			},
		);
	};
}

export function description(
	desc: string,
): (value: new () => object, context: ClassDecoratorContext) => void {
	return function descriptionDecorator(value) {
		(value as any)[kDescription] = desc;
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
				(this.constructor as unknown as CommandMeta)[
					kInjectPositionals
				] = context.access.set;
				return initial;
			},
		);
	};
}

type FlagConfig = Clearify<Omit<FlagSchema, 'parse' | 'setValue'>>;
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
			`onInit${toPascalCase(context.name)}As${typeName}`,
			function (initial) {
				let schema: Schema;
				if (Object.hasOwn(this.constructor, kSchema)) {
					schema = (this.constructor as any)[kSchema];
				} else {
					schema = new Schema();
					(this.constructor as any)[kSchema] = schema;
				}

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
		const instance = new cli();
		Parser.assertIsCommandMeta(cli);
		return new Parser(args, instance, cli as any);
	}

	private static assertIsCommandMeta(
		target: new () => object,
	): asserts target is CommandMeta {
		if (
			!(
				Object.hasOwn(target, kSchema) &&
				(target as any)[kSchema] instanceof Schema
			)
		) {
			throw new Error(
				`Tried to use class '${target.name}' as a command or cli but is missing a schema`,
			);
		}

		if (
			!(
				Object.hasOwn(target, kDescription) &&
				typeof (target as any)[kDescription] === 'string'
			)
		) {
			throw new Error(
				`Tried to use class '${target.name}' as a command or cli but is missing a description`,
			);
		}
	}

	// parser state
	private args: string[];
	private arg: string = '\0';
	private position: number = 0;
	private reachedPositionals: boolean = false;

	// parsed result and related
	private cliMeta: CliMeta<Cli>;
	private options: Cli;
	private activeOptions: object;
	private activeCommand: object | undefined = undefined;
	private activeSchema: Schema;

	constructor(args: string[], cli: Cli, cliMeta: CliMeta<Cli>) {
		this.args = args;
		this.nextArg();

		this.cliMeta = cliMeta;
		this.options = cli;
		this.activeOptions = cli;
		this.activeSchema = cliMeta[kSchema];
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
			} else if (this.activeCommand === undefined) {
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

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}
		this.arg = this.args[this.position++];
	}

	private parseCommand(): void {
		const commandMeta = this.cliMeta[kCommands].find(
			command => this.arg === toKebabCase(command.name),
		);
		if (commandMeta === undefined) {
			throw new Error(`Found unknown command '${this.arg}'`);
		}

		const command = new commandMeta();
		Parser.assertIsCommandMeta(commandMeta);
		this.cliMeta[kInjectCommand](this.options, command);

		this.activeCommand = command;
		this.activeOptions = command;
		this.activeSchema = commandMeta[kSchema];
	}

	private parseInlineValue(): void {
		const indexOfEqualSign = this.arg.indexOf('=');
		const argName = this.arg.slice(2, indexOfEqualSign);

		const schema = this.activeSchema.find(argName);
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

		const schema = this.activeSchema.find(argName);
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
		const inject = (
			this.activeOptions.constructor as unknown as CommandMeta
		)[kInjectPositionals];
		if (inject === undefined) {
			throw new Error(
				`Got unexpected positional '${this.arg}'${
					this.activeCommand !== undefined
						? `for command '${toKebabCase(
								this.activeCommand.constructor.name,
						  )}'`
						: ''
				}`,
			);
		}

		const rest = this.args.slice(this.position - 1);
		inject(this.activeOptions, rest);
	}

	private parseShortOption(): void {
		const short = this.arg[1];

		const schema = this.activeSchema.findByShort(short);
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
			const schema = this.activeSchema.findByShort(char);
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
