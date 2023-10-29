import { toKebabCase } from '../util/string.js';
import { App, Command, FlagSchema, SchemaRegistry } from './flag.js';

export type CommandSchema = Record<string, FlagSchema>;

export enum Lexed {
	Option = 'OPTION',
	Problem = 'PROBLEM',
	Positional = 'POSITIONAL',
	Command = 'COMMAND',
}

export type LexedArg =
	| {
			type: Lexed.Positional;
			index: number;
			value: string;
	  }
	| {
			type: Lexed.Option;
			index: number;
			name: string;
			value: any;
	  }
	| {
			type: Lexed.Positional;
			index: number;
			value: string;
	  }
	| {
			type: Lexed.Command;
			index: number;
			name: string;
	  };

export type Problem = {
	type: Lexed.Problem;
	index: number;
	message: string;
};

export type Lexeme = LexedArg | Problem;

export class Lexer {
	private args!: string[];
	private arg: string = '\0';
	private position: number = 0;
	private reachedTerminator: boolean = false;
	private command: string | undefined = undefined;

	constructor(private schemaRegistry: SchemaRegistry) {}

	lex(args: string[]): Lexeme[] {
		return [...this.lexemes(args)];
	}

	*lexemes(args: string[]): Generator<Lexeme, void, undefined> {
		this.setup(args);

		for (; this.arg !== '\0'; this.nextArg()) {
			if (this.reachedTerminator) {
				yield {
					type: Lexed.Positional,
					index: this.position - 1,
					value: this.arg,
				};
			} else if (this.arg === '--') {
				this.reachedTerminator = true;
			} else if (this.arg.startsWith('--') && this.arg.includes('=')) {
				yield this.getTokenForInlineValue();
			} else if (this.arg.startsWith('--')) {
				yield this.getTokenForLongOption();
			} else if (this.arg.startsWith('-') && this.arg.length === 2) {
				yield this.getTokenForShortOption();
			} else if (this.arg.startsWith('-') && this.arg.length > 2) {
				yield* this.getTokensForShortOptionGroup();
			} else if (this.command === undefined) {
				yield this.getTokenForCommand();
			} else {
				yield {
					type: Lexed.Positional,
					index: this.position - 1,
					value: this.arg,
				};
			}
		}
	}

	private bindOption(
		lexeme: Extract<Lexeme, { type: Lexed.Option }>,
		valueType: Exclude<FlagSchema['valueType'], null>,
	): Lexeme {
		const result = valueType(lexeme.value);
		if (result instanceof Error) {
			return {
				type: Lexed.Problem,
				index: lexeme.index,
				message: `Found invalid value at '${
					this.args[lexeme.index]
				}': ${result.message}`,
			};
		}
		lexeme.value = result;
		return lexeme;
	}

	private nextArg(): void {
		if (this.position >= this.args.length) {
			this.arg = '\0';
			return;
		}
		this.arg = this.args[this.position++];
	}

	private getTokenForCommand(): Lexeme {
		if (!this.schemaRegistry.isCommand(this.arg)) {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Found unknown command '${this.arg}'`,
			};
		}

		this.command = this.arg;
		return {
			type: Lexed.Command,
			index: this.position - 1,
			name: this.command,
		};
	}

	private getTokenForInlineValue(): Lexeme {
		const indexOfEqualSign = this.arg.indexOf('=');
		const arg = this.arg.slice(2, indexOfEqualSign);

		const schema = this.schemaRegistry.find(arg, this.command);
		if (schema === undefined) {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Tried to set a value for unknown option '--${arg}'`,
			};
		}

		if (schema.valueType === null) {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Got unexpected value for '--${arg}'`,
			};
		}

		return this.bindOption(
			{
				type: Lexed.Option,
				index: this.position - 1,
				name: schema.key,
				value: this.arg.slice(indexOfEqualSign + 1),
			},
			schema.valueType,
		);
	}

	private getTokenForLongOption(): Lexeme {
		const arg = this.arg.slice(2);
		const schema = this.schemaRegistry.find(arg, this.command);
		if (schema === undefined) {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Found unknown option '--${arg}'`,
			};
		}

		if (schema.valueType === null) {
			return {
				type: Lexed.Option,
				index: this.position - 1,
				name: schema.key,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Expected value for '--${arg}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return this.bindOption(
			{
				type: Lexed.Option,
				index: this.position - 2,
				name: schema.key,
				value,
			},
			schema.valueType,
		);
	}

	private getTokenForShortOption(): Lexeme {
		const short = this.arg[1];
		const schemaEntry = this.schemaRegistry.findEntryByShort(
			short,
			this.command,
		);
		if (schemaEntry === undefined) {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Found unknown alias '-${short}'`,
			};
		}

		const [, schema] = schemaEntry;

		if (schema.valueType === null) {
			return {
				type: Lexed.Option,
				index: this.position - 1,
				name: schema.key,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: Lexed.Problem,
				index: this.position - 1,
				message: `Expected value for '-${short}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return this.bindOption(
			{
				type: Lexed.Option,
				index: this.position - 2,
				name: schema.key,
				value,
			},
			schema.valueType,
		);
	}

	private getTokensForShortOptionGroup(): Lexeme[] {
		const lexemes: Lexeme[] = [];
		const group = this.arg.slice(1);
		for (let i = 0, char = group[i]; i < group.length; char = group[++i]) {
			const schemaEntry =
				this.schemaRegistry.findEntryByShort(char, this.command) ??
				this.schemaRegistry.findEntryByShort(char);
			if (schemaEntry === undefined) {
				lexemes.push({
					type: Lexed.Problem,
					index: this.position - 1,
					message: `Got invalid group '${this.arg}', contains unknown alias '-${char}'`,
				});
				break;
			}

			const [, schema] = schemaEntry;
			if (schema.valueType === null) {
				lexemes.push({
					type: Lexed.Option,
					index: this.position - 1,
					name: schema.key,
					value: true,
				});
			} else if (i < group.length - 1) {
				lexemes.push(
					this.bindOption(
						{
							type: Lexed.Option,
							index: this.position - 1,
							name: schema.key,
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
					lexemes.push({
						type: Lexed.Problem,
						index: this.position - 1,
						message: `Expected value for '-${char}' at the end of group but reached end of arguments`,
					});
				} else {
					lexemes.push(
						this.bindOption(
							{
								type: Lexed.Option,
								index: this.position - 2,
								name: schema.key,
								value,
							},
							schema.valueType,
						),
					);
				}
			}
		}

		return lexemes;
	}

	private setup(args: string[]): void {
		this.args = args;

		this.arg = '\0';
		this.position = 0;
		this.reachedTerminator = false;
		this.command = undefined;

		this.nextArg();
	}
}

export function parse<Globals extends object, CmdOptions extends object>(
	args: string[],
	app: Globals,
): [Globals, CmdOptions | undefined] {
	const registry = SchemaRegistry.fromApp(app);
	const lexer = new Lexer(registry);

	const lexedArgs: LexedArg[] = [];
	for (const lexed of lexer.lexemes(args)) {
		if (lexed.type === Lexed.Problem) {
			throw new Error(lexed.message);
		} else if (lexed.type === Lexed.Positional) {
			throw new Error(`Handling of positionals unimplemented`);
		}
		lexedArgs.push(lexed);
	}

	const appMeta = (app as App).constructor;
	const globalOptions = new appMeta();
	let commandOptions: Command | undefined;

	for (const lexed of lexedArgs) {
		if (
			lexed.type === Lexed.Option &&
			commandOptions !== undefined &&
			registry.strictFind(
				lexed.name,
				toKebabCase(commandOptions.constructor.name),
			)
		) {
			commandOptions[lexed.name] = lexed.value;
		} else if (lexed.type === Lexed.Option) {
			globalOptions[lexed.name] = lexed.value;
		} else if (lexed.type === Lexed.Command) {
			const commandMeta = registry.findCommandMeta(lexed.name)!;
			commandOptions = new commandMeta();
		}
	}

	return [globalOptions as Globals, commandOptions as any];
}
