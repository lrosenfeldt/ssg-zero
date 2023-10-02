import { Tokenizer, Schema, TokenType, Token } from './parse_args.js';

const schema: Schema = {
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

const tokenizer = new Tokenizer(schema);
