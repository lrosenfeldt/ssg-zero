export type FlagSchema =
	| {
			type: 'boolean';
			short?: string;
			default?: boolean;
	  }
	| {
			type: 'number';
			short?: string;
			default?: number;
	  }
	| {
			type: 'string';
			short?: string;
			default?: string;
	  };

export type CommandSchema = Record<string, FlagSchema>;

export type Schema = {
	globals: Record<string, FlagSchema>;
	commands: Record<string, CommandSchema>;
};

export enum TokenType {
	Option = 'OPTION',
	Problem = 'PROBLEM',
	Positional = 'POSITIONAL',
	Command = 'COMMAND',
}

export type Token =
	| {
			type: TokenType.Positional;
			index: number;
			value: string;
	  }
	| {
			type: TokenType.Option;
			index: number;
			name: string;
			value: any;
	  }
	| {
			type: TokenType.Positional;
			index: number;
			value: string;
	  }
	| {
			type: TokenType.Problem;
			index: number;
			message: string;
	  }
	| {
			type: TokenType.Command;
			index: number;
			name: string;
	  };

export class Tokenizer {
	private args: string[] = [];
	private arg: string = '\0';
	private position: number = 0;
	private reachedTerminator: boolean = false;
  private command: string | undefined = undefined;

	constructor(private schema: Schema) {}

	tokenize(args: string[]): Token[] {
		this.setup(args);

		const tokens: Array<Token | Token[]> = [];
		for (; this.arg !== '\0'; this.nextArg()) {
			if (this.reachedTerminator) {
				tokens.push({
					type: TokenType.Positional,
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
					type: TokenType.Positional,
					index: this.position - 1,
					value: this.arg,
				});
      }
		}

		return tokens.flatMap(tokenOrList => {
			if (Array.isArray(tokenOrList)) {
				return tokenOrList.map(token => this.bindIfOption(token));
			} else {
				return this.bindIfOption(tokenOrList);
			}
		});
	}

	private bindIfOption(token: Token): Token {
		if (token.type !== TokenType.Option) {
			return token;
		}
		const schema = this.schema.globals[token.name];
		if (schema.type !== 'number') {
			return token;
		}

		const value = (token.value as string).trim().toLowerCase();
		if (value === 'nan') {
			token.value = NaN;
			return token;
		}
		const asNumber = Number(value);
		if (Number.isNaN(asNumber)) {
			return {
				type: TokenType.Problem,
				index: token.index,
				message: `Expected a number for option '--${token.name}' but got '${token.value}'`,
			};
		}
		token.value = asNumber;
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
    if (!(this.arg in this.schema.commands)) {
      return {
        type: TokenType.Problem,
        index: this.position - 1,
        message: `Found unknown command '${this.arg}'`,
      }
    }

    this.command = this.arg;
    return {
      type: TokenType.Command,
      index: this.position - 1,
      name: this.command,
    }
  }

	private getTokenForInlineValue(): Token {
		const indexOfEqualSign = this.arg.indexOf('=');
		const arg = this.arg.slice(2, indexOfEqualSign);

		if (!(arg in this.schema.globals)) {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Tried to set a value for unknown option '--${arg}'`,
			};
		}

		const schema = this.schema.globals[arg];
		if (schema.type === 'boolean') {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Got unexpected value for '--${arg}'`,
			};
		}

		return {
			type: TokenType.Option,
			index: this.position - 1,
			name: arg,
			value: this.arg.slice(indexOfEqualSign + 1),
		};
	}

	private getTokenForLongOption(): Token {
		const arg = this.arg.slice(2);
		if (!(arg in this.schema.globals)) {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Found unknown option '--${arg}'`,
			};
		}

		const schema = this.schema.globals[arg];
		if (schema.type === 'boolean') {
			return {
				type: TokenType.Option,
				index: this.position - 1,
				name: arg,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Expected value for '--${arg}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return {
			type: TokenType.Option,
			index: this.position - 2,
			name: arg,
			value,
		};
	}

	private getTokenForShortOption(): Token {
		const short = this.arg[1];
		const schemaEntry = Object.entries(this.schema.globals).find(
			({ 1: s }) => s.short && s.short === short,
		);
		if (schemaEntry === undefined) {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Found unknown alias '-${short}'`,
			};
		}

		const [name, schema] = schemaEntry;

		if (schema.type === 'boolean') {
			return {
				type: TokenType.Option,
				index: this.position - 1,
				name,
				value: true,
			};
		}

		this.nextArg();
		if (this.arg === '\0') {
			return {
				type: TokenType.Problem,
				index: this.position - 1,
				message: `Expected value for '-${short}' but reached end of arguments`,
			};
		}

		const value = this.arg;
		return {
			type: TokenType.Option,
			index: this.position - 2,
			name,
			value,
		};
	}

	private getTokensForShortOptionGroup(): Token[] {
		const tokens: Token[] = [];
		const group = this.arg.slice(1);
		for (let i = 0, char = group[i]; i < group.length; char = group[++i]) {
			const schemaEntry = Object.entries(this.schema.globals).find(
				([, s]) => s.short && s.short === char,
			);
			if (schemaEntry === undefined) {
				tokens.push({
					type: TokenType.Problem,
					index: this.position - 1,
          message: `Got invalid group '${this.arg}', contains unknown alias '-${char}'`
				});
				break;
			}

			const [name, schema] = schemaEntry;
			if (schema.type === 'boolean') {
				tokens.push({
					type: TokenType.Option,
					index: this.position - 1,
					name,
					value: true,
				});
			} else if (i < group.length - 1) {
				tokens.push({
					type: TokenType.Option,
					index: this.position - 1,
					name,
					value: group.slice(i + 1),
				});
				break;
			} else {
				this.nextArg();
				const value = this.arg;
				if (value === '\0') {
					tokens.push({
						type: TokenType.Problem,
						index: this.position - 1,
						message: `Expected value for '-${char}' at the end of group but reached end of arguments`,
					});
				} else {
					tokens.push({
						type: TokenType.Option,
						index: this.position - 2,
						name,
						value,
					});
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
