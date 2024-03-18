import { parseArgs } from 'node:util';

export function number(value: string): number {
	const asNumber = Number(value);
	if (Number.isFinite(asNumber)) {
		return asNumber;
	}
	throw new Error(`Can't parse ${value} as number`);
}

type BooleanOptionConfig = {
	type: 'boolean';
	short?: string;
	help?: string;
	multiple?: false;
	default?: boolean;
};

type BooleanMultipleOptionConfig = {
	type: 'boolean';
	short?: string;
	help?: string;
	multiple: true;
	default?: boolean[];
};

type StringOptionConfig = {
	type: 'string';
	short?: string;
	help?: string;
	multiple?: false;
	default?: string;
};

type StringMultipleOptionConfig = {
	type: 'string';
	short?: string;
	help?: string;
	multiple: true;
	default?: string[];
};

type BaseOptionConfig =
	| BooleanOptionConfig
	| BooleanMultipleOptionConfig
	| StringOptionConfig
	| StringMultipleOptionConfig;

type ValueOptionConfig<Value> = {
	type: 'string';
	short?: string;
	help?: string;
	multiple?: false;
	default?: undefined;
	parse: (value: string) => Value;
	parsedDefault?: Value;
};

type ValueMultipleOptionConfig<Value> = {
	type: 'string';
	short?: string;
	help?: string;
	multiple: true;
	default?: undefined;
	parse: (value: string) => Value;
	parsedDefault?: Value[];
};

type NumberOptionConfig = ValueOptionConfig<number>;
type NumberMultipleOptionConfig = ValueMultipleOptionConfig<number>;

export type OptionConfig =
	| BaseOptionConfig
	| NumberOptionConfig
	| NumberMultipleOptionConfig;

type DefaultOrUndefined<Config extends BaseOptionConfig> = Config extends {
	default: any;
}
	? Config['default']
	: undefined;

type ParsedDefaultOrUndefined<Config extends BaseOptionConfig> =
	Config extends {
		parsedDefault: any;
	}
		? Config['parsedDefault']
		: undefined;

type ParsedArgs<Config extends Record<string, OptionConfig>> = {
	[Option in keyof Config]: Config[Option] extends BooleanOptionConfig
		? boolean | DefaultOrUndefined<Config[Option]>
		: Config[Option] extends BooleanMultipleOptionConfig
			? boolean[] | DefaultOrUndefined<Config[Option]>
			: Config[Option] extends NumberOptionConfig
				? number | ParsedDefaultOrUndefined<Config[Option]>
				: Config[Option] extends NumberMultipleOptionConfig
					? number[] | ParsedDefaultOrUndefined<Config[Option]>
					: Config[Option] extends StringOptionConfig
						? string | DefaultOrUndefined<Config[Option]>
						: Config[Option] extends StringMultipleOptionConfig
							? string[] | DefaultOrUndefined<Config[Option]>
							: never;
};

export type CliConfig = {
	name: string;
	help?: string;
	options: Record<string, OptionConfig>;
	commands: {
		[command: string]: {
			help?: string;
			options: Record<string, OptionConfig>;
		};
	};
};

export type ParsedCli<Cli extends CliConfig> =
	| {
			command: undefined;
			values: ParsedArgs<Cli['options']>;
	  }
	| {
			[Command in keyof Cli['commands']]: {
				command: Command;
				values: ParsedArgs<
					Omit<
						Cli['options'],
						keyof Cli['commands'][Command]['options']
					> &
						Cli['commands'][Command]['options']
				>;
			};
	  }[keyof Cli['commands']];

export function parse<Cli extends CliConfig>(
	cli: Cli,
	args: string[],
): ParsedCli<Cli> {
	const { tokens } = parseArgs({
		args,
		tokens: true,
		strict: false,
		allowPositionals: true,
		options: cli.options,
	});

	const firstPositional = tokens.find(token => token.kind === 'positional');
	let command: string | undefined = undefined;
	let commandArgs: string[] = [...args];
	const options: Record<string, OptionConfig> = { ...cli.options };
	if (firstPositional) {
		command = args[firstPositional.index];
		commandArgs.splice(firstPositional.index, 1);
		Object.assign(options, cli.commands[command as any].options);
	}

	const { values } = parseArgs({
		allowPositionals: false,
		args: commandArgs,
		options,
		strict: true,
	});

	for (const option in options) {
		const config = options[option];
		if (!(option in values)) {
			values[option] = undefined;
		}
		if (!('parse' in config)) continue;

		const value = values[option];
		if (value === undefined && 'parsedDefault' in config) {
			// @ts-expect-error this is fine, we want to change the type
			values[option] = config.parsedDefault;
		} else if (Array.isArray(value)) {
			// @ts-expect-error this is fine, we want to change the type
			values[option] = value.map(el => config.parse(el as string));
		} else if (value !== undefined) {
			// @ts-expect-error this is fine, we want to change the type
			values[option] = config.parse(value as string);
		}
	}

	return {
		command,
		values: values,
	} as any;
}

export function helpdoc<Cli extends CliConfig>(
	cli: Cli,
	command?: undefined | keyof Cli['commands'],
): string {
	if (command === undefined) {
		const lines = [
			`${cli.name} [Global options] <Command>`,
			cli.help ?? '',
			'',
			'Commands:',
			helpdocCommands(cli.commands),
			'',
			'Global Options:',
			helpdocOptions(cli.options),
		];
		return lines.join('\n');
	}

	const cmd = command as string;
	const lines = [
		`${cli.name} [Global options] ${cmd} [Options]`,
		cli.commands[cmd].help ?? '',
		'',
		'Options:',
		helpdocOptions(cli.commands[cmd].options),
	];

	return lines.join('\n');
}

function helpdocCommands(commands: CliConfig['commands']): string {
	const lines: Array<[id: string, desc: string]> = [];
	let longestId = 0;

	for (const command in commands) {
		const config = commands[command];

		longestId = Math.max(command.length, longestId);
		lines.push([command, config.help ?? '']);
	}

	return lines
		.map(line => line[0].padEnd(longestId, ' ') + '  ' + line[1])
		.join('\n');
}

function helpdocOptions(options: Record<string, OptionConfig>): string {
	const lines: Array<[id: string, desc: string]> = [];
	let longestId = 0;

	for (const option in options) {
		const config = options[option];

		let id = `--${option}`;
		if (config.short) {
			id = `-${config.short}, ${id}`;
		}
		if (config.type === 'string' && 'parse' in config) {
			id += ' ' + config?.parse?.name;
		} else if (config.type === 'string') {
			id += ' string';
		}

		longestId = Math.max(id.length, longestId);
		lines.push([id, config.help ?? '']);
	}

	return lines
		.map(line => line[0].padEnd(longestId, ' ') + '  ' + line[1])
		.join('\n');
}
