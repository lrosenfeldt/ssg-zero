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
		this: SlogBackend,
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

		this.write(level, message, attrs);
	};
}

export type Slog<Levels extends LogLevels> = {
	readonly levels: Levels;
	readonly [backendSym]: SlogBackend;
} & {
	[Label in keyof Levels]: LogFn;
};

export type Timestamp = () => string;
export function epochTime(): string {
	return Date.now().toString();
}
