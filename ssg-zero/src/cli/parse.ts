import { type ParseArgsConfig, parseArgs } from 'node:util';

function parseNumber(value: string): number {
	const asNumber = Number(value);
	if (Number.isFinite(asNumber)) {
		return asNumber;
	}
	throw new Error(`Can't parse ${value} as number`);
}

type Clearify<T> = { [K in keyof T]: T[K] } & {};
type ParseArgsOptionConfig = Clearify<
	Exclude<ParseArgsConfig['options'], undefined>[string]
>;
type OptionConfig = ParseArgsOptionConfig & {
	parse?: (value: string) => any;
	parsedDefault?: any;
};

type Globals = {
	version: boolean | undefined;
	help: boolean | undefined;
	config: string;
};

const globals = {
	version: {
		type: 'boolean',
		short: 'v',
	},
	help: {
		type: 'boolean',
		short: 'h',
	},
	config: {
		type: 'string',
		short: 'c',
		default: 'zero.config.js',
	},
} satisfies Record<string, OptionConfig>;

type Build = {
	parallelFs: number;
};

const build = {
	'parallel-fs': {
		type: 'string',
		short: 'f',
		parse: parseNumber,
		parsedDefault: 1,
	},
} satisfies Record<string, OptionConfig>;

type Serve = {
	port: number;
};

const serve = {
	port: {
		type: 'string',
		short: 'p',
		parse: parseNumber,
		parsedDefault: 4269,
	},
} satisfies Record<string, OptionConfig>;

type Dev = {
	parallelFs: number;
	port: number;
};

const dev = { ...build, ...serve } satisfies Record<string, OptionConfig>;

type ParsedCli =
	| { command: undefined; values: Globals }
	| { command: 'build'; values: Omit<Globals, keyof Build> & Build }
	| { command: 'dev'; values: Omit<Globals, keyof Dev> & Dev }
	| { command: 'serve'; values: Omit<Globals, keyof Serve> & Serve };

export function cli(args: string[]): ParsedCli {
	const { tokens } = parseArgs({
		args,
		tokens: true,
		allowPositionals: true,
		strict: false,
		options: globals,
	});

	const firstPositional = tokens.find(token => token.kind === 'positional');

	let command: string | undefined = undefined;
	const commandArgs: string[] = [...args];
	if (firstPositional) {
		command = args[firstPositional.index];
		commandArgs.splice(firstPositional.index, 1);
	}

	switch (command) {
		case undefined: {
			const { values } = parseArgs({
				args: commandArgs,
				allowPositionals: false,
				strict: true,
				options: globals,
			});
			return {
				command,
				values: {
					config: values.config!,
					help: values.help,
					version: values.version,
				},
			};
		}
		case 'build': {
			const { values } = parseArgs({
				args: commandArgs,
				allowPositionals: false,
				strict: true,
				options: { ...globals, ...build },
			});
			return {
				command,
				values: {
					config: values.config!,
					help: values.help,
					parallelFs:
						values['parallel-fs'] !== undefined
							? build['parallel-fs'].parse(values['parallel-fs'])
							: build['parallel-fs'].parsedDefault,
					version: values.version,
				},
			};
		}
		case 'dev': {
			const { values } = parseArgs({
				args: commandArgs,
				allowPositionals: false,
				strict: true,
				options: { ...globals, ...dev },
			});
			return {
				command,
				values: {
					config: values.config!,
					help: values.help,
					parallelFs:
						values['parallel-fs'] !== undefined
							? build['parallel-fs'].parse(values['parallel-fs'])
							: build['parallel-fs'].parsedDefault,
					port:
						values.port !== undefined
							? serve.port.parse(values.port)
							: serve.port.parsedDefault,
					version: values.version,
				},
			};
		}
		case 'serve': {
			const { values } = parseArgs({
				args: commandArgs,
				allowPositionals: false,
				strict: true,
				options: { ...globals, ...serve },
			});
			return {
				command,
				values: {
					config: values.config!,
					help: values.help,
					port:
						values.port !== undefined
							? serve.port.parse(values.port)
							: serve.port.parsedDefault,
					version: values.version,
				},
			};
		}
		default:
			throw new Error(`Unknown command '${command}'`);
	}
}
