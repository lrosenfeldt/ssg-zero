import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import { mkdir } from 'node:fs/promises';

import { FileWalker } from './file_walker.js';

describe('FileWalker', function () {
	before(async () => {
		// directory is not tracked by git and we cant use gitkeep here
		await mkdir('fixtures/empty', { recursive: true });
	});
	test('finds nothing for an empty directory', async function () {
		const fileWalker = new FileWalker('fixtures/empty');

		const walkedFiles = await fileWalker.toArray();

		assert.deepEqual(walkedFiles, []);
	});
	test('returns the children of a directory', async function () {
		const expectedFiles = new Set<string>([
			'fixtures/simple/lol.gif',
			'fixtures/simple/holiday_1.jpg',
			'fixtures/simple/holiday_2.jpg',
			'fixtures/simple/holiday_3.jpg',
		]);
		const fileWalker = new FileWalker('fixtures/simple');

		const walkedFiles = new Set<string>(await fileWalker.toArray());

		assert.deepEqual(walkedFiles, expectedFiles);
	});
	test('returns nested children of a directory', async function () {
		const expectedFiles = new Set<string>([
			'fixtures/pages/index.html',
			'fixtures/pages/README.md',
			'fixtures/pages/assets/style.css',
		]);
		const fileWalker = new FileWalker('fixtures/pages');

		const walkedFiles = new Set<string>(await fileWalker.toArray());

		assert.deepEqual(walkedFiles, expectedFiles);
	});
});
