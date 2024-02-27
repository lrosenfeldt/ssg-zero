import { type Writable } from 'node:stream';

export type LogLevels = Record<string, number>;

export type LogFn = {
	(): void;
	(message: string): void;
	(attrs: object): void;
	(message: string | undefined, attrs?: object): void;
};

export type Slog<Levels extends LogLevels> = SlogBase<Levels> & {
	[Label in keyof Levels]: LogFn;
};

export type Bindings = Record<string, any>;

export interface Handler {
	child(levels: LogLevels, bindings?: Bindings): Handler;
	handle(
		level: number,
		message: string | undefined,
		attrs: object | undefined,
		time: string,
	): string;
}

export type Timestamp = () => string;
export function epochTime(): string {
	return Date.now().toString();
}

export type EOL = '\n' | '\r\n';

const eolSym = Symbol('slog.eol');
const handlerSym = Symbol('slog.handler');
const streamSym = Symbol('slog.stream');
const timeSym = Symbol('slog.time');
const writeSym = Symbol('slog.write');

export function createLogFn(level: number): LogFn {
	return function (
		this: SlogBase<LogLevels>,
		messageOrAttrs?: string | object | undefined,
		attrs?: object,
	): void {
		let message: string | undefined;
		if (typeof messageOrAttrs === 'object') {
			message = undefined;
			attrs = messageOrAttrs;
		} else {
			message = messageOrAttrs;
		}
		this[writeSym](level, message, attrs);
	};
}

export class SlogBase<Levels extends LogLevels> {
	private [eolSym]: EOL;
	private [handlerSym]: Handler;
	private [streamSym]: Writable;
	private [timeSym]: Timestamp;

	readonly levels: Levels;

	constructor(
		levels: Levels,
		destination: Writable,
		handler: Handler,
		time: Timestamp,
		eol: EOL,
	) {
		this.levels = levels;
		this[streamSym] = destination;
		this[handlerSym] = handler;
		this[timeSym] = time;
		this[eolSym] = eol;
	}

	child(bindings?: Bindings): Slog<Levels> {
		const childHandler = this[handlerSym].child(this.levels, bindings);
		const slogBase = new SlogBase(
			this.levels,
			this[streamSym],
			childHandler,
			this[timeSym],
			this[eolSym],
		);

		const slog = Object.assign<
			SlogBase<Levels>,
			{ [Label in keyof Levels]: LogFn }
		>(
			slogBase,
			Object.keys(this.levels).reduce(
				(o, k) => {
					// @ts-expect-error a javascript wizard must do, what a javascript wizard does
					o[k] = this[k];
					return o;
				},
				{} as Record<keyof Levels, LogFn>,
			),
		);
		return slog;
	}

	private [writeSym](
		level: number,
		message: string | undefined,
		attrs: object | undefined,
	): void {
		const log = this[handlerSym].handle(
			level,
			message,
			attrs,
			this[timeSym](),
		);
		this[streamSym].write(log + this[eolSym]);
	}
}

export function noop() {}
