import { Parser, Schema } from './parse_args.js';

export const appSchema: Schema = {
	globals: {
		help: {
			type: 'boolean',
			short: 'h',
			default: false,
		},
		version: {
			type: 'boolean',
			default: false,
		},
	},
	commands: {
		dev: {
			port: {
				type: 'number',
				default: 4269,
			},
		},
	},
};

export class App {
	parser: Parser;

	constructor(
		private name: string,
		private description: string,
		private schema: Schema,
	) {
		this.parser = new Parser(this.schema);
	}

	usage(): string {
		const lines: Array<[aliases: string, desc: string]> = [];
		let maxAliasLength = 0;
		for (const name in this.schema.globals) {
			const schema = this.schema.globals[name];
			const line: [aliases: string, desc: string] = [
				`${
					schema?.short !== undefined ? `-${schema.short},` : '   '
				}--${name}`,
        'desc',
			];
			lines.push(line);
			maxAliasLength = Math.max(maxAliasLength, line[0].length);
		}

		const globalOptions = lines
			.map(
				([aliases, desc]) =>
					'  ' + aliases.padEnd(maxAliasLength, ' ') + '  ' + desc,
			)
			.join('\n');
		const commandNames = Object.keys(this.schema.commands);
		const longestCommandName = commandNames.reduce(
			(length, name) => Math.max(length, name.length),
			0,
		);
		const commands = commandNames
			.map(name => '  ' + name.padStart(longestCommandName, ' '))
			.join('\n');
		return `\
Usage: ${this.name} [OPTIONS] COMMAND

${this.description}

Commands:
${commands}

Global Options:
${globalOptions}

Run '${this.name} COMMAND --help' for more information on a command.
`;
	}
}


// const tokenizer = new Parser(schema);
