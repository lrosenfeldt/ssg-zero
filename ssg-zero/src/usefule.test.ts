import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { join } from 'node:path';

import { anyToError, exists, walkFiles } from './usefule.js';

suite('usefule', () => {
	suite('anyToError', () => {
		test('returns the same error', () => {
			const originalError = new Error(
				'Something is wrong, I can feel test.',
			);

			const error = anyToError(originalError);

			assert.equal(originalError, error);
		});

		suite('converts values & functions', () => {
			const table = [
				{ name: 'bigint', value: 69n, pattern: /69/ },
				{ name: 'boolean', value: false, pattern: /false/ },
				{ name: 'function', value: () => void 0, pattern: /function/ },
				{ name: 'null', value: null, pattern: /null/ },
				{ name: 'number', value: 42, pattern: /42/ },
				{ name: 'string', value: 'foo', pattern: /foo/ },
				{ name: 'symbol', value: Symbol(), pattern: /symbol/ },
				{ name: 'undefined', value: undefined, pattern: /undefined/ },
			];

			table.forEach(({ name, value, pattern }) => {
				test(`has ${name} as a cause`, () => {
					const error = anyToError(value);
					assert.equal(error.cause, value);
				});

				test(`reports the value for a ${name}`, () => {
					const error = anyToError(value);
					assert.match(error.message, pattern);
				});
			});
		});

		suite('converts an object', () => {
			test('has the object as cause', () => {
				const obj = { awesome: 'unicorn' };

				const error = anyToError(obj);

				assert.equal(error.cause, obj);
			});

			test('reports tests constructor', () => {
				const TestClass = class {
					constructor(public useless: number) {}
				};
				const testThing = new TestClass(-3);

				const error = anyToError(testThing);

				assert.match(error.message, /TestClass/i);
			});
		});
	});
	suite('exists', () => {
		test('resolves to false if a file does not exists', async () => {
			const doesItExist = await exists('fixtures/does/not/exist');
			assert.equal(doesItExist, false);
		});
		test('resolves to true if a file does exist', async () => {
			const doesItExist = await exists('fixtures/pages/index.html');
			assert.equal(doesItExist, true);
		});
	});
	suite('walkFiles', () => {
		test('yields nothing for an empty directory', async () => {
			const walkedFiles: string[] = [];

			for await (const file of walkFiles('fixtures/empty')) {
				walkedFiles.push(join(file.dir, file.base));
			}

			assert.deepEqual(walkedFiles, []);
		});
		test('yields the children of a directory', async () => {
			const expectedFiles = new Set<string>([
				'fixtures/simple/lol.gif',
				'fixtures/simple/holiday_1.jpg',
				'fixtures/simple/holiday_2.jpg',
				'fixtures/simple/holiday_3.jpg',
			]);
			const walkedFiles = new Set<string>([]);

			for await (const file of walkFiles('fixtures/simple')) {
				walkedFiles.add(join(file.dir, file.base));
			}

			assert.deepEqual(walkedFiles, expectedFiles);
		});
		test('yields nested children of a directory', async () => {
			const expectedFiles = new Set<string>([
				'fixtures/pages/index.html',
				'fixtures/pages/README.md',
				'fixtures/pages/assets/style.css',
			]);
			const walkedFiles = new Set<string>([]);

			for await (const file of walkFiles('fixtures/pages')) {
				walkedFiles.add(join(file.dir, file.base));
			}

			assert.deepEqual(walkedFiles, expectedFiles);
		});
	});
});
