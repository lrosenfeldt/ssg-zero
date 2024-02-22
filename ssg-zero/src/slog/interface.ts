import { backendSym, SlogBackend } from './backend.js';

export type LogLevels = Record<string, number>;

export type LogFn = {
	(): void;
	(message: string): void;
	(attrs: object): void;
	(message?: string, attrs?: object): void;
};

export function createLogFn(level: number): LogFn {
	return function log(
		this: Slog<LogLevels>,
		mesageOrAttrs?: string | object | undefined,
		attrs?: object,
	): void {
		let message: string | undefined;
		if (typeof mesageOrAttrs === 'object') {
			message = undefined;
			attrs = mesageOrAttrs;
		} else {
			message = mesageOrAttrs;
		}

		this[backendSym].write(level, message, attrs);
	};
}

export function child<Levels extends LogLevels>(
	this: Slog<Levels>,
	bindings?: Record<string, any>,
): Slog<Levels> {
	const backend = this[backendSym].child(this.levels, bindings);

	const slog = Object.assign<{}, Slog<Levels>, { [backendSym]: SlogBackend }>(
		{},
		this,
		{
			[backendSym]: backend,
		},
	);

	return slog;
}

export type Slog<Levels extends LogLevels> = {
	readonly levels: Levels;
	readonly [backendSym]: SlogBackend;

	child(bindings?: Record<string, any>): Slog<Levels>;
} & {
	[Label in keyof Levels]: LogFn;
};

export type Timestamp = () => string;
export function epochTime(): string {
	return Date.now().toString();
}
