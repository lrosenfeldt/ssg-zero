import assert from 'node:assert/strict';
import { after, before, describe as suite, test } from 'node:test';
import { chmod, readFile } from 'node:fs/promises';

import { UsefuleServer } from './server.js';

suite('usefule.ts: UsefuleServer', function () {
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
