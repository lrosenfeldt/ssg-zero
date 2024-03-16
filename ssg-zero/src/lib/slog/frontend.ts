import { type Writable } from 'stream';
import {
	createLogFn,
	epochTime,
	noop,
	SlogBase,
	type EOL,
	type Handler,
	type LogFn,
	type LogLevels,
	type Slog,
	type Timestamp,
} from './base.js';
import { JsonHandler } from './handler.js';

export const DefaultLogLevel = {
	trace: 1 << 1,
	debug: 1 << 2,
	info: 1 << 3,
	warn: 1 << 4,
	error: 1 << 5,
};

export type DefaultLogLevels = typeof DefaultLogLevel;
export type DefaultLogLevelLabel = keyof DefaultLogLevels;

export type SlogOptions<CustomLevels extends LogLevels> =
	| {
			useOnlyCustomLevels?: false;
			customLevels?: CustomLevels;
			level?: DefaultLogLevelLabel | keyof CustomLevels;
			handler?: Handler;
			time?: Timestamp;
			eol?: EOL;
	  }
	| {
			useOnlyCustomLevels: true;
			customLevels: CustomLevels;
			level: keyof CustomLevels;
			handler?: Handler;
			time?: Timestamp;
			eol?: EOL;
	  };

type Join<Obj, Base> = Obj & Omit<Base, keyof Obj>;

export function slog<CustomLevels extends LogLevels = {}>(
	options: SlogOptions<CustomLevels> & { useOnlyCustomLevels: true },
	destination?: Writable,
): Slog<CustomLevels>;
export function slog<CustomLevels extends LogLevels = {}>(
	options?: SlogOptions<CustomLevels> & { useOnlyCustomLevels?: false },
	destination?: Writable,
): Slog<Join<DefaultLogLevels, CustomLevels>>;
export function slog<CustomLevels extends LogLevels = {}>(
	options: SlogOptions<CustomLevels> = {},
	destination: Writable = process.stdout,
): Slog<LogLevels> {
	const levels: LogLevels = {};
	if (options.useOnlyCustomLevels) {
		Object.assign(levels, options.customLevels);
	} else {
		Object.assign(levels, options.customLevels, DefaultLogLevel);
	}

	const time = options.time ?? epochTime;
	const eol = options.eol ?? '\n';
	const handler = options.handler ?? new JsonHandler(levels);
	const label = options.level ?? 'info';
	const level: number = levels[label as string];
	if (level === undefined) {
		throw new Error(
			`Level '${label.toString()}' is not included in levels ${JSON.stringify(levels)}`,
		);
	}

	const slogBase = new SlogBase(levels, destination, handler, time, eol);
	const slog = Object.assign<
		SlogBase<LogLevels>,
		{ [Label in keyof LogLevels]: LogFn }
	>(
		slogBase,
		Object.entries(levels).reduce(
			(o, [k, v]) => {
				if (v < level) {
					o[k] = noop;
				} else {
					o[k] = createLogFn(v);
				}
				return o;
			},
			{} as Record<string, LogFn>,
		),
	);

	return slog;
}
