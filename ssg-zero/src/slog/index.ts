import { Writable } from 'node:stream';

import { backendSym, SlogBackend } from './backend.js';
import {
	child,
	createLogFn,
	epochTime,
	type LogFn,
	type LogLevels,
	type Slog,
	type Timestamp,
} from './interface.js';

export const DefaultLogLevel = {
	info: 4,
	error: 16,
};

export type DefaultLogLevels = typeof DefaultLogLevel;
export type DefaultLogLevelLabel = keyof typeof DefaultLogLevel;

export type SlogOptions<CustomLevels extends LogLevels> =
	| {
			useOnlyCustomLevels?: false;
			level?: DefaultLogLevelLabel | keyof CustomLevels;
			customLevels?: CustomLevels;
			time?: Timestamp;
			maxDepth?: number;
	  }
	| {
			useOnlyCustomLevels: true;
			level: keyof CustomLevels;
			customLevels: CustomLevels;
			time?: Timestamp;
	  };

type Join<Obj, Base> = Obj & Omit<Base, keyof Obj>;

export function slog<CustomLevels extends LogLevels>(
	options: SlogOptions<CustomLevels> & { useOnlyCustomLevels: true },
	destination?: Writable,
): Slog<CustomLevels>;
export function slog<CustomLevels extends LogLevels>(
	options?: SlogOptions<CustomLevels> & { useOnlyCustomLevels?: false },
	destination?: Writable,
): Slog<Join<DefaultLogLevels, CustomLevels>>;
export function slog<CustomLevels extends LogLevels>(
	options: SlogOptions<CustomLevels> | undefined = {},
	destination?: Writable,
): Slog<LogLevels> {
	const levels: LogLevels = options.useOnlyCustomLevels
		? Object.assign({}, options.customLevels)
		: Object.assign({}, options.customLevels, DefaultLogLevel);

	const time = options.time ?? epochTime;
	const backend = new SlogBackend(
		levels,
		destination ?? process.stdout,
		undefined,
		time,
	);
	const slog = Object.assign<
		{
			levels: LogLevels;
			[backendSym]: SlogBackend;
			child: Slog<LogLevels>['child'];
		},
		Record<string, LogFn>
	>(
		{ levels, [backendSym]: backend, child },
		Object.entries(levels).reduce(
			(o, [k, v]) => {
				o[k] = createLogFn(v);
				return o;
			},
			{} as Record<string, LogFn>,
		),
	);

	return slog;
}
