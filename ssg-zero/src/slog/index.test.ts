import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { once } from 'node:events';
import { PassThrough } from 'node:stream';

import { DefaultLogLevel, slog } from './index.js';
import { type Timestamp } from './interface.js';

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
			info: DefaultLogLevel.info,
			error: DefaultLogLevel.error,
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
	const destination = new PassThrough();

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
				fn: () => undefined,
			},
			expected: {
				level,
				time,
				msg: 'rainbow flavor',
				props: true,
				rock: 'nroll will never die',
				count: -1,
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
						letsgo: '[deep object]',
					},
				},
			},
		};

		logger.info(message, attrs);

		const json: string[] = await once(destination, 'data');
		const data = JSON.parse(json[0]);

		assert.deepEqual(data, expected);
	});
});
