import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { stringifySafe } from './backend.js';

suite('stringifySafe', function () {
	test('a plain object can be deserialized', function () {
		const input = {
			number: 42,
			string: 'Hello, World!',
			isBoolean: true,
			nullable: null,
		};

		const expected = {
			number: 42,
			string: 'Hello, World!',
			isBoolean: true,
			nullable: null,
		};

		const json = stringifySafe(input, 1, 5);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});

	test('a nested object can be deserialized', function () {
		const input = {
			outer: 'hi',
			inner: {
				value: 69,
				tag: 'nice',
			},
		};

		const expected = {
			outer: 'hi',
			inner: {
				value: 69,
				tag: 'nice',
			},
		};
		const json = stringifySafe(input, 1, 5);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});

	test('a depth limited object can be deserialized', function () {
		const input = {
			inner: {
				value: 69,
			},
		};

		const expected = {
			inner: '[deep object]',
		};

		const json = stringifySafe(input, 1, 1);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});

	test('a circular object is analyzed until a certain depth', function () {
		const input = {
			foo: 'bar',
			baz: {
				value: null as object | null,
				another: 'one',
			},
		};
		input.baz.value = input;

		const expected = {
			foo: 'bar',
			baz: {
				value: {
					foo: 'bar',
					baz: {
						value: '[deep object]',
						another: 'one',
					},
				},
				another: 'one',
			},
		};

		const json = stringifySafe(input, 1, 4);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});

	test('a shared referenced is tolerated above the max depth', function () {
		const shared = { name: 'You know the name!' };
		const input = {
			foo: 'bar',
			baz: {
				value: shared,
				another: 'one',
			},
			foobar: {
				value: shared,
			},
		};

		const expected = {
			foo: 'bar',
			baz: {
				value: {
					name: 'You know the name!',
				},
				another: 'one',
			},
			foobar: {
				value: {
					name: 'You know the name!',
				},
			},
		};

		const json = stringifySafe(input, 1, 5);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});

	test('unserializable properties are skipped', function () {
		const input = {
			foo: 'bar',
			fn: () => undefined,
			[Symbol('dont care this is a test')]: 'Hi!',
			largeN: 4269n,
			empty: undefined,
		};

		const expected = {
			foo: 'bar',
		};

		const json = stringifySafe(input, 1, 5);
		const data = JSON.parse(json);

		assert.deepEqual(data, expected);
	});
});
