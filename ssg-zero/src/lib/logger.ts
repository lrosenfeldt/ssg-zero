import {
	DefaultLogLevel,
	slog,
	TextHandler,
	type DefaultLogLevels,
	type Slog,
} from './slog/index.js';

export type Logger = Slog<DefaultLogLevels>;

let startOfLogger = performance.now();

export function time(start: number = startOfLogger): string {
	const runtime = performance.now() - start; // ms;
	const ms = Math.trunc(runtime % 1000);

	let seconds = Math.floor(runtime / 1000);

	let minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;

	if (minutes >= 60) {
		startOfLogger = performance.now();
	}
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export const logger = slog({
	handler: new TextHandler(DefaultLogLevel),
	level: 'trace',
	time,
	eol: '\n',
});
