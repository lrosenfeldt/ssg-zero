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
	name: 'ssg-zero',
	options: globals,
	help: 'Work on your static site',
	commands: {
		build: { options: build, help: 'Build your site' },
		dev: { options: dev, help: 'Serve & reactively build your site' },
		serve: { options: serve, help: 'Serve your site on localhost' },
	},
} satisfies CliConfig;
