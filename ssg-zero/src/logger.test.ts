import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { ConsoleLogger, LogLevel } from './logger.js';

suite('ConsoleLogger', function () {
	const debugMessage = 'What is love?';
	const infoMessage = "Baby, don't hurt me";
	const warnMessage = "Don't hurt me";
	const errorMessage = 'No more';

	const table = [
		{
			level: LogLevel.Debug,
			messages: [debugMessage, infoMessage, warnMessage, errorMessage],
		},
		{
			level: LogLevel.Info,
			messages: [infoMessage, warnMessage, errorMessage],
		},
		{ level: LogLevel.Warn, messages: [warnMessage, errorMessage] },
		{ level: LogLevel.Error, messages: [errorMessage] },
	];

	for (const { level, messages } of table) {
		test(`only runs for logs on ${level} and below`, function (t) {
			const logger = new ConsoleLogger(level);
			const consoleLog = t.mock.method(console, 'log', () => void 0);

			logger.debug(debugMessage);
			logger.info(infoMessage);
			logger.warn(warnMessage);
			logger.error(errorMessage);

			assert.equal(consoleLog.mock.callCount(), messages.length);
		});
	}
	test('has a sane log format', function (t) {
		const referenceDate = new Date('2020-04-20T06:09:11');

		const consoleLog = t.mock.method(console, 'log', () => void 0);
		t.mock.method(global, 'Date', function () {
			return referenceDate;
		});

		const logger = new ConsoleLogger(LogLevel.Error);
		logger.error('unicorn');

		assert.equal(
			consoleLog.mock.calls[0].arguments[0],
			'2020/04/20 06:09:11 ERROR unicorn',
		);
	});
});
