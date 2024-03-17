import {
	type OptionConfig,
	type CliConfig,
	number,
} from './better_parse_args.js';

const globals = {
	version: {
		type: 'boolean',
		short: 'v',
		default: undefined,
	},
	help: {
		type: 'boolean',
		short: 'h',
		default: undefined,
	},
	config: {
		type: 'string',
		short: 'c',
		default: 'zero.config.js',
	},
} satisfies Record<string, OptionConfig>;

const build = {
	'parallel-fs': {
		type: 'string',
		short: 'f',
		parse: number,
		parsedDefault: 1,
	},
} satisfies Record<string, OptionConfig>;

const serve = {
	port: {
		type: 'string',
		short: 'p',
		parse: number,
		parsedDefault: 4269,
	},
} satisfies Record<string, OptionConfig>;

const dev = { ...build, ...serve };

export const cli = {
	options: globals,
	commands: {
		build: { options: build },
		dev: { options: dev },
		serve: { options: serve },
	},
} satisfies CliConfig;
