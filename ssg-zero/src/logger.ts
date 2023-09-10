export interface Logger {
	debug(message: string): void;
	error(message: string): void;
	info(message: string): void;
	warn(message: string): void;
}

export enum LogLevel {
	Debug = 'DEBUG',
	Error = 'ERROR',
	Info = 'INFO',
	Warn = 'WARN',
}

export class ConsoleLogger implements Logger {
	private static noop = () => void 0;

	constructor(maxLogLevel: LogLevel) {
		switch (maxLogLevel) {
			case LogLevel.Debug:
				break;
			case LogLevel.Info:
				this.debug = ConsoleLogger.noop;
				break;
			case LogLevel.Warn:
				this.debug = ConsoleLogger.noop;
				this.info = ConsoleLogger.noop;
				break;
			case LogLevel.Error:
				this.debug = ConsoleLogger.noop;
				this.info = ConsoleLogger.noop;
				this.warn = ConsoleLogger.noop;
				break;
		}
	}

	debug(message: string): void {
		this.log(LogLevel.Debug, message);
	}
	error(message: string): void {
		this.log(LogLevel.Error, message);
	}
	info(message: string): void {
		this.log(LogLevel.Info, message);
	}
	warn(message: string): void {
		this.log(LogLevel.Warn, message);
	}

	private log(logLevel: LogLevel, message: string): void {
		const date = new Date();
		const formattedDate = [
			date.getFullYear().toString(),
			// javascript getMonth is starting a zero
			// why tho?
			(date.getMonth() + 1).toString().padStart(2, '0'),
			date.getDate().toString().padStart(2, '0'),
		].join('/');

		const time = [
			date.getHours().toString().padStart(2, '0'),
			date.getMinutes().toString().padStart(2, '0'),
			date.getSeconds().toString().padStart(2, '0'),
		].join(':');

		console.log(`${formattedDate} ${time} ${logLevel} ${message}`);
	}
}
