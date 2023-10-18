import { App, FlagSchema, commandsKey, schemaKey } from './flag.js';

export type CommandSchema = Record<string, FlagSchema>;

export type Schema = {
	globals: Record<string, FlagSchema>;
	commands: Record<string, CommandSchema>;
};

export enum Parsed {
	Option = 'OPTION',
	Problem = 'PROBLEM',
	Positional = 'POSITIONAL',
	Command = 'COMMAND',
}

export type ParsedArg =
	| {
			type: Parsed.Positional;
			index: number;
			value: string;
	  }
	| {
			type: Parsed.Option;
			index: number;
			name: string;
			value: any;
	  }
	| {
			type: Parsed.Positional;
			index: number;
			value: string;
	  }
	| {
			type: Parsed.Command;
			index: number;
			name: string;
	  };

export type ParsedProblem = {
	type: Parsed.Problem;
	index: number;
	message: string;
};

export type Token = ParsedArg | ParsedProblem;

export class Parser {
	private args: string[] = [];
	private arg: string = '\0';
	private position: number = 0;
	private reachedTerminator: boolean = false;
	private schemaRegistry: SchemaRegistry;
	private command: string | undefined = undefined;

	constructor(schema: SchemaRegistry) {
		this.schemaRegistry = schema;
	}

	parse(args: string[]): Token[] {
		this.setup(args);

		const tokens: Array<Token | Token[]> = [];
		for (; this.arg !== '\0'; this.nextArg()) {
			if (this.reachedTerminator) {
				tokens.push({
					type: Parsed.Positional,
					index: this.position - 1,
					value: this.arg,
				});
			} else if (this.arg === '--') {
				this.reachedTerminator = true;
			} else if (this.arg.startsWith('--') && this.arg.includes('=')) {
				tokens.push(this.getTokenForInlineValue());
			} else if (this.arg.startsWith('--')) {
				tokens.push(this.getTokenForLongOption());
			} else if (this.arg.startsWith('-') && this.arg.length === 2) {
				tokens.push(this.getTokenForShortOption());
			} else if (this.arg.startsWith('-') && this.arg.length > 2) {
				tokens.push(this.getTokensForShortOptionGroup());
			} else if (this.command === undefined) {
				tokens.push(this.getTokenForCommand());
			} else {
				tokens.push({
					type: Parsed.Positional,
					index: this.position - 1,
					value: this.arg,
				});
			}
		}

		return tokens.flat(1);
	}

	private bindOption(
		token: Extract<Token, { type: Parsed.Option }>,
		valueType: Exclude<FlagSchema['valueType'], null>,
	): Token {
		const result = valueType(token.value);
		if (result instanceof Error) {
			return {
				type: Parsed.Problem,
				index: token.index,
				message: `Found invalid value for option '--${token.name}': ${result.message}`,
			};
		}
		token.value = result;
		return token;
	}

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}
		this.arg = this.args[this.position++];
	}

	private getTokenForCommand(): Token {
		if (!this.schemaRegistry.isCommand(this.arg)) {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Found unknown command '${this.arg}'`,
			};
		}

		this.command = this.arg;
		return {
			type: Parsed.Command,
			index: this.position - 1,
			name: this.command,
		};
	}

	private getTokenForInlineValue(): Token {
		const indexOfEqualSign = this.arg.indexOf('=');
		const arg = this.arg.slice(2, indexOfEqualSign);

		const schema = this.schemaRegistry.find(arg, this.command);
		if (schema === undefined) {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Tried to set a value for unknown option '--${arg}'`,
			};
		}

		if (schema.valueType === null) {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Got unexpected value for '--${arg}'`,
			};
		}

		return this.bindOption(
			{
				type: Parsed.Option,
				index: this.position - 1,
				name: arg,
				value: this.arg.slice(indexOfEqualSign + 1),
			},
			schema.valueType,
		);
	}

	private getTokenForLongOption(): Token {
		const arg = this.arg.slice(2);
		const schema = this.schemaRegistry.find(arg, this.command);
		if (schema === undefined) {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Found unknown option '--${arg}'`,
			};
		}

		if (schema.valueType === null) {
			return {
				type: Parsed.Option,
				index: this.position - 1,
				name: arg,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Expected value for '--${arg}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return this.bindOption(
			{
				type: Parsed.Option,
				index: this.position - 2,
				name: arg,
				value,
			},
			schema.valueType,
		);
	}

	private getTokenForShortOption(): Token {
		const short = this.arg[1];
		const schemaEntry = this.schemaRegistry.findEntryByShort(
			short,
			this.command,
		);
		if (schemaEntry === undefined) {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Found unknown alias '-${short}'`,
			};
		}

		const [name, schema] = schemaEntry;

		if (schema.valueType === null) {
			return {
				type: Parsed.Option,
				index: this.position - 1,
				name,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: Parsed.Problem,
				index: this.position - 1,
				message: `Expected value for '-${short}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return this.bindOption(
			{
				type: Parsed.Option,
				index: this.position - 2,
				name,
				value,
			},
			schema.valueType,
		);
	}

	private getTokensForShortOptionGroup(): Token[] {
		const tokens: Token[] = [];
		const group = this.arg.slice(1);
		for (let i = 0, char = group[i]; i < group.length; char = group[++i]) {
			const schemaEntry = this.schemaRegistry.findEntryByShort(
				char,
				this.command,
			);
			if (schemaEntry === undefined) {
				tokens.push({
					type: Parsed.Problem,
					index: this.position - 1,
					message: `Got invalid group '${this.arg}', contains unknown alias '-${char}'`,
				});
				break;
			}

			const [name, schema] = schemaEntry;
			if (schema.valueType === null) {
				tokens.push({
					type: Parsed.Option,
					index: this.position - 1,
					name,
					value: true,
				});
			} else if (i < group.length - 1) {
				tokens.push(
					this.bindOption(
						{
							type: Parsed.Option,
							index: this.position - 1,
							name,
							value: group.slice(i + 1),
						},
						schema.valueType,
					),
				);
				break;
			} else {
				this.nextArg();
				const value = this.arg;
				if (value === '\0') {
					tokens.push({
						type: Parsed.Problem,
						index: this.position - 1,
						message: `Expected value for '-${char}' at the end of group but reached end of arguments`,
					});
				} else {
					tokens.push(
						this.bindOption(
							{
								type: Parsed.Option,
								index: this.position - 2,
								name,
								value,
							},
							schema.valueType,
						),
					);
				}
			}
		}

		return tokens;
	}

	private setup(args: string[]): void {
		this.args = args;
		this.position = 0;
		this.arg = '\0';
		this.nextArg();

		this.command = undefined;
		this.reachedTerminator = false;
	}
}

export class SchemaRegistry {
	static fromApp(app: App): SchemaRegistry {
		const schema: Schema = { globals: {}, commands: {} };
		for (const name in app[schemaKey]) {
			const flagSchema = app[schemaKey][name];
			schema.globals[name] = flagSchema as unknown as FlagSchema;
		}
		for (const command of app[commandsKey]) {
			schema.commands[command.name] = {};
			for (const name in command[schemaKey]) {
				const flagSchema = command[schemaKey][name];
				schema.commands[command.name][name] =
					flagSchema as unknown as FlagSchema;
			}
		}
		return new SchemaRegistry(schema);
	}

	constructor(private schema: Schema) {}

	isCommand(command: string): boolean {
		return command in this.schema.commands;
	}

	getDefaults(command?: string): Record<string, any> {
		const defaults: Record<string, any> = {};
		for (const name in this.schema.globals) {
			const flagSchema = this.schema.globals[name];
			if (flagSchema?.default !== undefined) {
				defaults[name] = flagSchema.default;
			}
		}

		if (command === undefined) {
			return defaults;
		}

		const commandSchema = this.schema.commands[command];
		for (const name in commandSchema) {
			const flagSchema = commandSchema[name];
			if (flagSchema?.default !== undefined) {
				defaults[name] = flagSchema.default;
			}
		}

		return defaults;
	}

	find(name: string, command?: string): FlagSchema | undefined {
		if (command !== undefined && name in this.schema.commands[command]) {
			return this.schema.commands[command][name];
		}
		if (name in this.schema.globals) {
			return this.schema.globals[name];
		}
		return undefined;
	}

	findEntryByShort(
		short: string,
		command?: string,
	): [name: string, schema: FlagSchema] | undefined {
		if (command !== undefined) {
			const schemaEntry = Object.entries(
				this.schema.commands[command],
			).find(([, s]) => s.short && s.short === short);
			if (schemaEntry !== undefined) return schemaEntry;
		}
		return Object.entries(this.schema.globals).find(
			([, s]) => s.short && s.short === short,
		);
	}
}
