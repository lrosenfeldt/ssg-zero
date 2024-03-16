import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PassThrough, type Writable } from 'node:stream';

import { Timestamp, type Handler, EOL } from './base.js';
import { DefaultLogLevel, slog } from './frontend.js';
import { JsonHandler, TextHandler } from './handler.js';
import { once } from 'node:events';

function createTestStream(): Writable {
	return new PassThrough({
		readableObjectMode: true,
		writableObjectMode: true,
	});
}

describe('slog creation', function () {
	const handler: Handler = {
		child(_levels, _bindings) {
			return this;
		},
		handle(level, _message, _attrs, _time) {
			return level.toString() + ' Say hello to my little friend.';
		},
	};
	const destination = createTestStream();
	const logger = slog(
		{
			level: 'trace',
			handler,
		},
		destination,
	);

	test('only includes default levels by default', function () {
		assert.deepEqual(logger.levels, DefaultLogLevel);
	});

	test(
		'uses handler and eol to write log entry',
		{ timeout: 100 },
		function (_, done) {
			const data: string[] = [];
			// collect writes

			// write data
			destination.cork();
			logger.trace();
			logger.debug();
			logger.info();
			logger.warn();
			logger.error();

			destination.on('data', msg => {
				data.push(msg);
				if (data.length < 5) {
					return;
				}

				assert.equal(
					data[0],
					DefaultLogLevel.trace + ' Say hello to my little friend.\n',
				);
				assert.equal(
					data[1],
					DefaultLogLevel.debug + ' Say hello to my little friend.\n',
				);
				assert.equal(
					data[2],
					DefaultLogLevel.info + ' Say hello to my little friend.\n',
				);
				assert.equal(
					data[3],
					DefaultLogLevel.warn + ' Say hello to my little friend.\n',
				);
				assert.equal(
					data[4],
					DefaultLogLevel.error + ' Say hello to my little friend.\n',
				);
				done();
			});

			destination.uncork();
		},
	);

	test('lower log levels are cut off', { timeout: 100 }, function (t, done) {
		const stream = createTestStream();
		const handler = {
			child(_levels, _bindings) {
				return this;
			},
			handle: t.mock.fn(),
		} satisfies Handler;
		const logger = slog(
			{
				level: 'info',
				handler,
			},
			stream,
		);

		stream.cork();
		logger.trace();
		logger.debug();
		logger.info();

		stream.on('close', () => {
			assert.equal(handler.handle.mock.callCount(), 1);
			done();
		});

		stream.uncork();
		stream.destroy();
	});

	test('default log levels are not overwritten', function () {
		const customLevels = {
			'hell yeah': 1,
			'hell no': 600,
		};
		const logger = slog({ customLevels: customLevels });

		assert.deepEqual(logger.levels, {
			...customLevels,
			...DefaultLogLevel,
		});
	});
	test('levels can be limited to only custom levels', function () {
		const customLevels = {
			'hell yeah': 1,
			'hell no': 600,
		};
		const logger = slog({
			customLevels: customLevels,
			useOnlyCustomLevels: true,
			level: 'hell no',
		});

		assert.deepEqual(logger.levels, customLevels);
	});
});

describe('slog with text handler', async function () {
	const time = '2024/02/04 16:44:17';
	const t: Timestamp = () => time;
	const eol: EOL = '\r\n';
	const destination = createTestStream();
	const logger = slog(
		{
			handler: new TextHandler(DefaultLogLevel),
			time: t,
			eol,
		},
		destination,
	);

	const table = [
		{
			name: 'for no message & attributes',
			message: undefined,
			attrs: undefined,
			expected: '2024/02/04 16:44:17 INFO\r\n',
		},
		{
			name: 'for a simple message',
			message: 'Simple but not easy',
			attrs: undefined,
			expected: '2024/02/04 16:44:17 INFO Simple but not easy\r\n',
		},
		{
			name: 'for an empty message and simple attributes',
			message: undefined,
			attrs: {
				jump: 'high',
				target: 'over barricade',
				count: 3,
				isLastChance: true,
				will: undefined,
				be: () => undefined,
				ignored: Symbol(),
				hard: 1000n,
			},
			expected:
				'2024/02/04 16:44:17 INFO jump=high target="over barricade" count=3 isLastChance=true\r\n',
		},
		{
			name: 'for a message and nested attributes',
			message: 'Hi!',
			attrs: {
				song: 'Everyone else is an asshole',
				meta: {
					track: 1,
					album: 'Candy Coated Fury',
				},
				isBanger: true,
			},
			expected:
				'2024/02/04 16:44:17 INFO Hi! song="Everyone else is an asshole" meta={"track":1,"album":"Candy Coated Fury"} isBanger=true\r\n',
		},
	];

	for (const { name, message, attrs, expected } of table) {
		await test(`produces a text log ${name}`, async function () {
			logger.info(message, attrs);

			const [text] = await once(destination, 'data');
			assert.equal(text, expected);
		});
	}
});

describe('slog with json text handler', async function () {
	const level = DefaultLogLevel.warn;
	const time = 4_200_600_900;
	const t: Timestamp = () => time.toString();
	const eol: EOL = '\n';
	const destination = createTestStream();
	const logger = slog(
		{
			handler: new JsonHandler(DefaultLogLevel),
			time: t,
			eol,
		},
		destination,
	);

	const table = [
		{
			name: 'for no message & attributes',
			message: undefined,
			attrs: undefined,
			expected: {
				time,
				level,
			},
		},
		{
			name: 'for a simple message',
			message: 'Simple but not easy',
			attrs: undefined,
			expected: {
				time,
				level,
				msg: 'Simple but not easy',
			},
		},
		{
			name: 'for an empty message and simple attributes',
			message: undefined,
			attrs: {
				jump: 'high',
				target: 'over barricade',
				count: 3,
				isLastChance: true,
				will: undefined,
				be: () => undefined,
				ignored: Symbol(),
				hard: 1000n,
			},
			expected: {
				time,
				level,
				jump: 'high',
				target: 'over barricade',
				count: 3,
				isLastChance: true,
			},
		},
		{
			name: 'for a message and nested attributes',
			message: 'Hi!',
			attrs: {
				song: 'Everyone else is an asshole',
				meta: {
					track: 1,
					album: 'Candy Coated Fury',
				},
				isBanger: true,
			},
			expected: {
				time,
				level,
				msg: 'Hi!',
				song: 'Everyone else is an asshole',
				meta: {
					track: 1,
					album: 'Candy Coated Fury',
				},
				isBanger: true,
			},
		},
	];

	for (const { name, message, attrs, expected } of table) {
		await test(`produces valid json ${name}`, async function () {
			logger.warn(message, attrs);

			const [json] = await once(destination, 'data');
			const data = JSON.parse(json);
			assert.deepEqual(data, expected);
		});
	}

	test('bindings are included when using a text handler', async function () {
		const time = '247.123 s';
		const eol: EOL = '\n';
		const destination = createTestStream();
		const logger = slog(
			{
				handler: new TextHandler(DefaultLogLevel),
				time: () => time,
				level: 'debug',
				eol,
			},
			destination,
		);

		const child = logger.child({ hello: 'world' });
		child.debug({ this: 'is', fine: true });

		const [text] = await once(destination, 'data');

		assert.equal(
			text,
			'247.123 s DEBUG hello=world this=is fine=true' + eol,
		);
	});

	test('bindings are included when using a json handler', async function () {
		const level = DefaultLogLevel.error;
		const time = 4_200_600_900;
		const t: Timestamp = () => time.toString();
		const eol: EOL = '\n';
		const destination = createTestStream();
		const logger = slog(
			{
				handler: new JsonHandler(DefaultLogLevel),
				level: 'error',
				time: t,
				eol,
			},
			destination,
		);

		const child = logger.child({ hello: 'world' });
		child.error({ more: 'props', count: 1 });

		const [json] = await once(destination, 'data');
		const data = JSON.parse(json);

		assert.deepEqual(data, {
			level,
			time,
			hello: 'world',
			more: 'props',
			count: 1,
		});
	});
});
