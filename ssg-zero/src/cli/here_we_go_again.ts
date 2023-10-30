import { toKebabCase, toPascalCase } from '../util/string.js';

export type FlagType = (value: string) => any;

export type FlagSchema = {
	valueType: FlagType | null;
	setValue: (target: object, value: any) => void;
	short?: string;
	description?: string;
	default?: any;
};

type Clearify<T> = { [K in keyof T]: T[K] } & {};

export type FlagConfig = Clearify<
	Omit<FlagSchema, 'default' | 'setValue' | 'valueType'>
>;

export class Schema {
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

type App<Self extends object = object> = Self & { constructor: AppMeta<Self> };

export function command<
	Commands extends object,
	Constructor extends new () => Commands,
>(
	cmds: Array<Constructor>,
): (
	value: undefined,
	context: ClassFieldDecoratorContext<object, Commands | undefined> & {
		name: string;
	},
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
	flagType: FlagSchema['valueType'],
	config: FlagConfig,
): <Value extends BaseValue>(
	value: undefined,
	context: ClassFieldDecoratorContext<object, Value> & { name: string },
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
						Pick<FlagSchema, 'default' | 'setValue' | 'valueType'>
					>(config, {
						default: initialValue,
						valueType: flagType,
						setValue: context.access.set,
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

function setFunctionName<Fn extends Function>(name: string, fn: Fn): Fn {
	return Object.defineProperty(fn, 'name', {
		configurable: true,
		enumerable: false,
		writable: false,
		value: name,
	});
}

class Parser<Cli extends object> {
	// parser state
	private args: string[];
	private arg: string = '\0';
	private position: number = 0;
	private reachedTerminator: boolean = false;

	// parsed options and control structures for them
	private meta: AppMeta<Cli>;
	private cli: Cli;
	private activeOptions: object;
	private activeSchema: Schema;

	constructor(args: string[], meta: AppMeta<Cli>) {
		this.args = args;

		this.meta = meta;
		this.cli = new meta();
		this.activeOptions = this.cli;
		this.activeSchema = meta[schemaKey];

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
			} else if (this.activeOptions === this.cli) {
				this.parseCommand();
			} else {
				// positionals
				continue;
			}
		}

		return this.cli;
	}

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}

		this.arg = this.args[this.position++];
	}

	private parseCommand(): void {
		const commandMeta = this.meta[commandsKey].find(
			command => this.arg === toKebabCase(command.name),
		);
		if (commandMeta === undefined) {
			throw new Error(`Found unknown command '${this.arg}'`);
		}

		const command = new commandMeta();
		this.activeOptions = command;
		this.meta[injectKey](command);
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

		if (schema.valueType === null) {
			throw new Error(`Got unexpected value for '--${argName}'`);
		}

		this.parseValueBySchema(this.arg.slice(indexOfEqualSign + 1), schema);
	}

	private parseLongOption(): void {
		const argName = this.arg.slice(2);
		const schema = this.activeSchema.find(argName);

		if (schema === undefined) {
			throw new Error(`Found unknown option '--${argName}'`);
		}

		if (schema.valueType === null) {
			schema.setValue(this.activeOptions, true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '--${argName}' but reached end of arguments`,
			);
		}

		this.parseValueBySchema(this.arg, schema);
	}

	private parseShortOption(): void {
		const short = this.arg[1];
		const schema = this.activeSchema.findSchemaByShort(short);

		if (schema === undefined) {
			throw new Error(`Found unknown alias '-${short}'`);
		}

		if (schema.valueType === null) {
			schema.setValue(this.activeOptions, true);
			return;
		}

		this.nextArg();
		if (this.arg === '\0') {
			throw new Error(
				`Expected value for '-${short}' but reached end of arguments`,
			);
		}

		this.parseValueBySchema(this.arg, schema);
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

			if (schema.valueType !== null && i < group.length - 1) {
				// middle of group
				const value = group.slice(i + 1);
				this.parseValueBySchema(value, schema);
				break;
			} else if (schema.valueType !== null) {
				this.nextArg();
				if (this.arg === '\0') {
					throw new Error(
						`Expected value for '-${char}' at the end of group but reached end of arguments`,
					);
				}

				this.parseValueBySchema(this.arg, schema);
				break;
			} else {
				schema.setValue(this.activeOptions, true);
				continue;
			}
		}
	}

	private parseValueBySchema(value: string, schema: FlagSchema) {
		const parsedValue = schema.valueType!(value);
		// TODO: do proper error handling
		if (parsedValue instanceof Error) {
			parsedValue.message = `Found invalid value '${this.arg}': ${parsedValue.message}`;
			throw parsedValue;
		}

		schema.setValue(this.activeOptions, parsedValue);
	}
}

export function parse<Cli extends object>(args: string[], cli: new () => Cli): Cli {
  const parser =  new Parser(args, cli as AppMeta<Cli>);
  return parser.parse();
}
