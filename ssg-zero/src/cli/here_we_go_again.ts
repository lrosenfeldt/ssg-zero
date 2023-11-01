import { toKebabCase, toPascalCase } from '../util/string.js';

type Clearify<T> = { [K in keyof T]: T[K] } & {};
type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

export type FlagParser = (value: string, arg: string, group?: string) => any;

export type FlagSchema = {
	parse: FlagParser | null;
	setValue: (value: any) => void;
	short?: string;
	description?: string;
	default?: any;
};

export type FlagConfig = Clearify<
	Omit<FlagSchema, 'default' | 'parse' | 'setValue'>
>;

class Schema {
	private schema: Record<string, FlagSchema> = {};

	find(name: string): FlagSchema | undefined {
		if (Object.hasOwn(this.schema, name)) {
			return this.schema[name];
		}
		return undefined;
	}

	findSchemaByShort(short: string): FlagSchema | undefined {
		return Object.values(this.schema).find(
			s => s.short && s.short === short,
		);
	}

	insert(name: string, flagSchema: FlagSchema): void {
		this.schema[name] = flagSchema;
	}
}

const schemaKey = Symbol('schema');
const commandsKey = Symbol('commands');
const injectKey = Symbol('inject');

type CommandMeta = (new () => object) & {
	[schemaKey]: Schema;
};

type AppMeta<App extends object = object> = (new () => App) & {
	[commandsKey]: CommandMeta[];
	[injectKey]: (command: object) => void;
	[schemaKey]: Schema;
};

export function command<
	Commands extends object,
	Constructor extends new () => Commands,
>(
	cmds: Array<Constructor>,
): (
	value: undefined,
	context: ClassNamedFieldDecoratorContext<object, Commands | undefined>,
) => (this: object, initial: Commands | undefined) => undefined {
	return function commandDecorator(_, context) {
		return setFunctionName(
			`onInit${toPascalCase(context.name)}AsCommandField`,
			function (this) {
				(this.constructor as any)[commandsKey] = cmds;
				(this.constructor as any)[injectKey] = context.access.set.bind(
					null,
					this,
				);
				return undefined;
			},
		);
	};
}

export function typedFlag<BaseValue>(
	flagType: FlagSchema['parse'],
	config: FlagConfig,
): <Value extends BaseValue>(
	value: undefined,
	context: ClassNamedFieldDecoratorContext<object, Value>,
) => (this: object, initial: Value) => Value {
	const typeName = flagType !== null ? flagType.name : 'boolean';
	return setFunctionName(`${typeName}FlagDecorator`, function (_, context) {
		return setFunctionName(
			`onInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`,
			function (initialValue) {
				let schema: Schema;
				if (Object.hasOwn(this.constructor, schemaKey)) {
					schema = (this.constructor as any)[schemaKey];
				} else {
					schema = new Schema();
					(this.constructor as any)[schemaKey] = schema;
				}
				schema.insert(
					toKebabCase(context.name),
					Object.assign<
						FlagConfig,
						Pick<FlagSchema, 'default' | 'parse' | 'setValue'>
					>(config, {
						default: initialValue,
						parse: flagType,
						setValue: context.access.set.bind(null, this),
					}),
				);

				return initialValue;
			},
		);
	});
}

export const boolean = (typedFlag<boolean | undefined>).bind(null, null);

export const number = (typedFlag<number | undefined>).bind(
	null,
	function number(value, arg, group) {
		if (value.toLowerCase() === 'nan') {
			return NaN;
		}
		const asNumber = Number(value);
		if (Number.isNaN(asNumber)) {
			throw new Error(
				`Found invalid number '${value}' for '${arg}'${
					group ? ` in '${group}'` : ''
				}`,
			);
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

class Parser<Cli extends object> {
	private static assertIsCommandMeta(
		ctor: Function,
	): asserts ctor is AppMeta {
		if (
			!Object.hasOwn(ctor, schemaKey) ||
			!((ctor as any)[schemaKey] instanceof Schema)
		) {
			throw new Error(
				`Given class ${ctor.name} has no schema configured. Use the 'boolean', 'number or 'string' decorator on at least one field.`,
			);
		}
	}

	static from<Cli extends object>(
		args: string[],
		cli: new () => Cli,
	): Parser<Cli> {
		const dto = new cli();
		Parser.assertIsCommandMeta(cli);
		return new Parser<Cli>(args, cli, dto);
	}

	// parser state
	private args: string[];
	private arg: string = '\0';
	private position: number = 0;
	private reachedTerminator: boolean = false;

	// parsed options and control structures for them
	private cli: AppMeta<Cli>;
	private dto: Cli;
	private activeSchema: Schema;
	private activeCommand: string | undefined = undefined;

	private constructor(args: string[], cli: AppMeta<Cli>, cliDto: Cli) {
		this.args = args;

		this.cli = cli;
		this.dto = cliDto;
		this.activeSchema = cli[schemaKey];

		this.nextArg();
	}

	parse(): Cli {
		for (; this.arg !== '\0'; this.nextArg()) {
			if (this.reachedTerminator) {
				// posiiontals
				continue;
			} else if (this.arg === '--') {
				this.reachedTerminator = true;
				continue;
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
				// positionals
				continue;
			}
		}

		return this.dto;
	}

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}

		this.arg = this.args[this.position++];
	}

	private parseCommand(): void {
		const commandName = this.arg;
		const commandMeta = this.cli[commandsKey].find(
			command => commandName === toKebabCase(command.name),
		);
		if (commandMeta === undefined) {
			throw new Error(`Found unknown command '${this.arg}'`);
		}

		const command = new commandMeta();
		Parser.assertIsCommandMeta(commandMeta);
		this.activeCommand = commandName;
		this.cli[injectKey](command);
		this.activeSchema = commandMeta[schemaKey];
	}

	private parseInlineValue(): void {
		const indexOfEqualSign = this.arg.indexOf('=');
		const argName = this.arg.slice(2, indexOfEqualSign);

		const schema = this.activeSchema.find(argName);
		if (schema === undefined) {
			throw new Error(
				`Tried to set a value for unknown option '--${argName}'`,
			);
		}

		if (schema.parse === null) {
			throw new Error(`Got unexpected value for '--${argName}'`);
		}

		schema.setValue(
			schema.parse(this.arg.slice(indexOfEqualSign + 1), `--${argName}`),
		);
	}

	private parseLongOption(): void {
		const argName = this.arg.slice(2);
		const schema = this.activeSchema.find(argName);

		if (schema === undefined) {
			throw new Error(`Found unknown option '--${argName}'`);
		}

		if (schema.parse === null) {
			schema.setValue(true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '--${argName}' but reached end of arguments`,
			);
		}

		schema.setValue(schema.parse(this.arg, `--${argName}`));
	}

	private parseShortOption(): void {
		const short = this.arg[1];
		const schema = this.activeSchema.findSchemaByShort(short);

		if (schema === undefined) {
			throw new Error(`Found unknown alias '-${short}'`);
		}

		if (schema.parse === null) {
			schema.setValue(true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '-${short}' but reached end of arguments`,
			);
		}

		schema.setValue(schema.parse(this.arg, `-${this.arg}`));
	}

	private parseShortOptionGroup(): void {
		const group = this.arg.slice(1);
		for (let i = 0, char = group[0]; i < group.length; char = group[++i]) {
			const schema = this.activeSchema.findSchemaByShort(char);

			if (schema === undefined) {
				throw new Error(
					`Got invalid group '${this.arg}', contains unknown alias '-${char}'`,
				);
			}

			if (schema.parse !== null && i < group.length - 1) {
				// middle of group
				const value = group.slice(i + 1);
				const argGroup = i === 0 ? undefined : group.slice(0, i + 1);
				schema.setValue(schema.parse(value, `-${char}`, `-${argGroup}`));
				break;
			} else if (schema.parse !== null) {
				this.nextArg();
				if (this.arg === '\0') {
					throw new Error(
						`Expected value for '-${char}' at the end of group but reached end of arguments`,
					);
				}

				schema.setValue(schema.parse(this.arg, `-${char}`, `-${group}`));
				break;
			} else {
				schema.setValue(true);
				continue;
			}
		}
	}
}

export function parse<Cli extends object>(
	args: string[],
	cli: new () => Cli,
): Cli {
	const parser = Parser.from(args, cli);
	return parser.parse();
}
