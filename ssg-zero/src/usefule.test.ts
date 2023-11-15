import assert from 'node:assert/strict';
import { after, before, describe as suite, test } from 'node:test';
import { join } from 'node:path';

import { UsefuleServer, anyToError, exists, walkFiles } from './usefule.js';
import { mkdir, readFile } from 'node:fs/promises';
import { chmod } from 'node:fs/promises';

suite('anyToError', function () {
	test('returns the same error', function () {
		const originalError = new Error('Something is wrong, I can feel test.');

		const error = anyToError(originalError);

		assert.equal(originalError, error);
	});

	suite('converts values & functions', function () {
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

		for (const { name, value, pattern } of table) {
			const error = anyToError(value);

			test(`has ${name} as a cause`, function () {
				assert.equal(error.cause, value);
			});

			test(`reports the value for a ${name}`, function () {
				assert.match(error.message, pattern);
			});
		}
	});

	suite('converts an object', function () {
		test('has the object as cause', function () {
			const obj = { awesome: 'unicorn' };

			const error = anyToError(obj);

			assert.equal(error.cause, obj);
		});

		test('reports tests constructor', function () {
			const TestClass = class {
				constructor(public useless: number) {}
			};
			const testThing = new TestClass(-3);

			const error = anyToError(testThing);

			assert.match(error.message, /TestClass/i);
		});
	});
});

suite('exists', function () {
	test('resolves to false if a file does not exists', async function () {
		const doesItExist = await exists('fixtures/does/not/exist');
		assert.equal(doesItExist, false);
	});
	test('resolves to true if a file does exist', async function () {
		const doesItExist = await exists('fixtures/pages/index.html');
		assert.equal(doesItExist, true);
	});
});
suite('walkFiles', function () {
	before(async () => {
		// directory is not tracked by git and we cant use gitkeep here
		await mkdir('fixtures/empty', { recursive: true });
	});

	test('yields nothing for an empty directory', async function () {
		const walkedFiles: string[] = [];

		for await (const file of walkFiles('fixtures/empty')) {
			walkedFiles.push(join(file.dir, file.base));
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
			walkedFiles.add(join(file.dir, file.base));
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
			walkedFiles.add(join(file.dir, file.base));
		}

		assert.deepEqual(walkedFiles, expectedFiles);
	});
});
suite('UsefuleServer', function () {
	const server = new UsefuleServer('fixtures', 4269);
	async function requestFile(path: string) {
		return await fetch(new URL(path, server.baseUrl), {
			method: 'GET',
		});
	}

	before(async function () {
		await chmod('fixtures/bad_files/unreadable.json', 0o0344);
		await server.serve();
	});

	after(async function () {
		await chmod('fixtures/bad_files/unreadable.json', 0o0644);
		await server.stop();
	});

	test('responds with 415 for unsupported file types', async function () {
		const res = await requestFile('bad_files/audio.aiff');

		assert.equal(res.status, 415);
	});
	test('responds with 404 for unexisting files', async function () {
		const res = await requestFile('empty/does_not_exists.txt');

		assert.equal(res.status, 404);
	});
	test('responds with the actual file', async function (t) {
		const actualContent = await readFile(
			'fixtures/pages/index.html',
			'utf-8',
		);
		const res = await requestFile('pages/index.html');

		assert.equal(res.status, 200);
		await t.test('has the correct mime type', function () {
			assert.equal(res.headers.get('Content-Type'), 'text/html');
		});
		await t.test('responds with the actual content', async function () {
			assert.equal(await res.text(), actualContent);
		});
	});
	test('responds with 500 for a locked file', async function () {
		const res = await requestFile('bad_files/unreadable.json');

		assert.equal(res.status, 500);
	});
	test('fails if serve is called on running server', async function () {
		await assert.rejects(async () => await server.serve());
	});
});
