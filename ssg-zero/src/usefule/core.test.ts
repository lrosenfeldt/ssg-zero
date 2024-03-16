import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import { anyToError, exists, walkFiles } from './core.js';
import { mkdir } from 'node:fs/promises';

describe('anyToError', function () {
	test('returns the same error', function () {
		const originalError = new Error('Something is wrong, I can feel test.');

		const error = anyToError(originalError);

		assert.equal(originalError, error);
	});

	const table = [
		{ name: 'bigint', value: 69n, pattern: /69/ },
		{ name: 'boolean', value: false, pattern: /false/ },
		{ name: 'function', value: () => void 0, pattern: /function/ },
		{ name: 'null', value: null, pattern: /null/ },
		{ name: 'number', value: 42, pattern: /42/ },
		{ name: 'string', value: 'foo', pattern: /foo/ },
		{ name: 'symbol', value: Symbol(), pattern: /symbol/ },
		{ name: 'undefined', value: undefined, pattern: /undefined/ },
		{
			name: 'object literal',
			value: Object.create(null),
			pattern: /object literal/,
		},
		{ name: 'object', value: { awesome: 'unicorn' }, pattern: /object/ },
	];

	for (const { name, value, pattern } of table) {
		test(`reports the value of ${name} in the error `, function () {
			const error = anyToError(value);
			assert.match(error.message, pattern);
		});
	}

	test('for an instance the class name is reported', function () {
		const TestClass = class {
			constructor(public useless: number) {}
		};
		const testThing = new TestClass(-3);

		const error = anyToError(testThing);

		assert.match(error.message, /TestClass/i);
	});
});

describe('exists', function () {
	test('resolves to false if a file does not exists', async function () {
		const doesItExist = await exists('fixtures/does/not/exist');
		assert.equal(doesItExist, false);
	});
	test('resolves to true if a file does exist', async function () {
		const doesItExist = await exists('fixtures/pages/index.html');
		assert.equal(doesItExist, true);
	});
});
describe('walkFiles', function () {
	before(async () => {
		// directory is not tracked by git and we cant use gitkeep here
		await mkdir('fixtures/empty', { recursive: true });
	});

	test('yields nothing for an empty directory', async function () {
		const walkedFiles: string[] = [];

		for await (const file of walkFiles('fixtures/empty')) {
			walkedFiles.push(file.filePath);
		}

		assert.deepEqual(walkedFiles, []);
	});
	test('yields the children of a directory', async function () {
		const expectedFiles = new Set<string>([
			'fixtures/simple/lol.gif',
			'fixtures/simple/holiday_1.jpg',
			'fixtures/simple/holiday_2.jpg',
			'fixtures/simple/holiday_3.jpg',
		]);
		const walkedFiles = new Set<string>([]);

		for await (const file of walkFiles('fixtures/simple')) {
			walkedFiles.add(file.filePath);
		}

		assert.deepEqual(walkedFiles, expectedFiles);
	});
	test('yields nested children of a directory', async function () {
		const expectedFiles = new Set<string>([
			'fixtures/pages/index.html',
			'fixtures/pages/README.md',
			'fixtures/pages/assets/style.css',
		]);
		const walkedFiles = new Set<string>([]);

		for await (const file of walkFiles('fixtures/pages')) {
			walkedFiles.add(file.filePath);
		}

		assert.deepEqual(walkedFiles, expectedFiles);
	});
});
