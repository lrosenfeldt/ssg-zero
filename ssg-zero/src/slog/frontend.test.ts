import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { once } from 'node:events';
import { PassThrough, type Transform } from 'node:stream';

import { DefaultLogLevel, slog } from './index.js';
import { type Timestamp } from './interface.js';

function createTestStream(): Transform {
	// make logs more readable
	return new PassThrough({
		readableObjectMode: true,
		writableObjectMode: true,
	});
}

suite('slog creation', function () {
	test('default log levels are used', function () {
		const logger = slog();

		assert.deepEqual(logger.levels, DefaultLogLevel);

		for (const label in DefaultLogLevel) {
			assert.equal(typeof logger[label], 'function');
		}
	});
	test('custom levels are added and default log levels are preserved', function () {
		const logger = slog({
			customLevels: {
				'hell yeah': 9000,
				'hell no': 12,
				info: Math.PI,
			},
		});
		const expectedLevels = {
			...DefaultLogLevel,
			'hell yeah': 9000,
			'hell no': 12,
		};

		assert.deepEqual(logger.levels, expectedLevels);

		for (const label in expectedLevels) {
			assert.equal(typeof (logger as any)[label], 'function');
		}
	});
	test('if specified only custom levels are used', function () {
		const customLevels = {
			'hell yeah': 9000,
			'hell no': 12,
			fatal: Number.MAX_SAFE_INTEGER,
		};
		const logger = slog({
			customLevels,
			level: 'hell no',
			useOnlyCustomLevels: true,
		});

		assert.deepEqual(logger.levels, customLevels);

		for (const label in customLevels) {
			assert.equal(typeof (logger as any)[label], 'function');
		}

		for (const label in DefaultLogLevel) {
			assert.equal((logger as any)[label], undefined);
		}
	});
});

suite('slog', function () {
	const label = 'info';
	const level = DefaultLogLevel[label];
	const time = 1989;
	const timestamp: Timestamp = () => time.toString();
	const destination = createTestStream();

	const table = [
		{
			name: 'for no message and no attributes',
			message: undefined,
			attrs: undefined,
			expected: {
				level,
				time,
			},
		},
		{
			name: 'for a simple message and no attributes',
			message: 'Hello, World!',
			attrs: undefined,
			expected: {
				level,
				time,
				msg: 'Hello, World!',
			},
		},
		{
			name: 'when message contains json key characters',
			message: '{"awesome":101010}',
			attrs: undefined,
			expected: {
				level,
				time,
				msg: '{"awesome":101010}',
			},
		},
		{
			name: 'when message contains json key characters',
			message: '{"awesome":101010}',
			attrs: undefined,
			expected: {
				level,
				time,
				msg: '{"awesome":101010}',
			},
		},
		{
			name: 'for no message and simple attributes',
			message: 'rainbow flavor',
			attrs: {
				props: true,
				rock: 'nroll will never die',
				count: -1,
				nullable: null,
				fn: () => undefined,
			},
			expected: {
				level,
				time,
				msg: 'rainbow flavor',
				props: true,
				rock: 'nroll will never die',
				count: -1,
				nullable: null,
			},
		},
		{
			name: 'for a simple message and nested attributes',
			message: 'what?',
			attrs: {
				props: false,
				rock: 'nroll will never die',
				count: 100000000,
				fn: () => undefined,
				inner: {
					box: {
						value: 'abc',
						isPresent: true,
					},
				},
			},
			expected: {
				level,
				time,
				msg: 'what?',
				props: false,
				rock: 'nroll will never die',
				count: 100000000,
				inner: {
					box: {
						value: 'abc',
						isPresent: true,
					},
				},
			},
		},
		{
			name: 'for a nice message and empty attributes',
			message: 'noice',
			attrs: {},
			expected: {
				level,
				time,
				msg: 'noice',
			},
		},
		{
			name: 'for attributes with properties on its prototype, which should be ignored',
			message: undefined,
			attrs: Object.assign(
				{ value: 54 },
				Object.create({ parent: true }),
			),
			expected: {
				level,
				time,
				value: 54,
			},
		},
		{
			name: 'for attributes with NaN as prop',
			message: undefined,
			attrs: {
				number1: NaN,
				number2: 2,
			},
			expected: {
				level,
				time,
				number1: null,
				number2: 2,
			},
		},
	];

	const logger = slog({ time: timestamp }, destination);
	for (const { name, message, attrs, expected } of table) {
		test(`produces valid json ${name}`, async function () {
			logger.info(message, attrs);

			const json: string[] = await once(destination, 'data');
			const data = JSON.parse(json[0]);

			assert.deepEqual(data, expected);
		});
	}

	test('can handle circular references', async function () {
		const message = 'this is super irrelevant';

		const attrs = {
			foo: 'bar',
			baz: {
				letsgo: null as object | null,
			},
		};
		attrs.baz.letsgo = attrs;
		const expected = {
			level,
			time,
			msg: message,
			foo: 'bar',
			baz: {
				letsgo: {
					foo: 'bar',
					baz: {
						letsgo: {
							foo: 'bar',
							baz: '[deep object]',
						},
					},
				},
			},
		};

		logger.info(message, attrs);

		const json: string[] = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, expected);
	});

	test('can write an object without a message', async function () {
		logger.info({ chord: 'C#' });

		const json = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, {
			level: DefaultLogLevel.info,
			time,
			chord: 'C#',
		});
	});

	test('uses epoch time as default', async function (t) {
		const destination = createTestStream();
		const time = 1_000_000;
		const dateNow = t.mock.method(Date, 'now', () => time);
		const logger = slog(undefined, destination);

		logger.info('epic epoch');

		const json = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.equal(dateNow.mock.callCount(), 1);
		assert.deepEqual(data, {
			level: DefaultLogLevel.info,
			time,
			msg: 'epic epoch',
		});
	});

	test('circular dependencies can be limited in depth', async function () {
		const destination = createTestStream();
		const time = 42_000_000;
		const t: Timestamp = () => time.toString();
		const logger = slog({ time: t, maxDepth: 2 }, destination);
		const message = 'this is fine';
		const attrs: any = { value: null };
		attrs.value = attrs;
		const expected = {
			level,
			time,
			msg: message,
			value: {
				value: '[deep object]',
			},
		};

		logger.info('this is fine', attrs);

		const json = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, expected);
	});
	test('appends eol to each log', async function () {
		const destination = createTestStream();
		const time = 301;
		const t: Timestamp = () => time.toString();
		const logger = slog({ time: t, eol: '\r\n' }, destination);

		logger.info('but in the end it doesnt really matter');

		const json: string[] = await once(destination, 'data');
		assert.ok(json[0].endsWith('\r\n'));
	});
});

suite('child', function () {
	test('bindings are contained in the log', async function () {
		const destination = createTestStream();
		const time = 1989;
		const t: Timestamp = () => time.toString();
		const base = slog({ time: t }, destination);
		const logger = base.child({ foofoo: 'dragon' });

		const msg = 'Through fire and flames we carry on!';
		const attrs = { value: -254 };
		const expected = {
			level: DefaultLogLevel.info,
			msg,
			time,
			foofoo: 'dragon',
			value: attrs.value,
		};

		logger.info(msg, attrs);
		const json: string[] = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, expected);
	});
	test('bindings are in the log', async function () {
		const destination = createTestStream();
		const time = 1989;
		const t: Timestamp = () => time.toString();
		const base = slog({ time: t }, destination);
		const logger = base.child({ foofoo: 'dragon' });

		const msg = 'Through fire and flames we carry on!';
		const attrs = { value: -254 };
		const expected = {
			level: DefaultLogLevel.info,
			msg,
			time,
			foofoo: 'dragon',
			value: attrs.value,
		};

		logger.info(msg, attrs);
		const json: string[] = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, expected);
	});
});
