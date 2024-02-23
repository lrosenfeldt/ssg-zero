import assert from 'node:assert/strict';
import { after, before, describe as suite, test } from 'node:test';

import { once } from 'node:events';
import { chmod, readFile } from 'node:fs/promises';

import { UsefuleServer } from './server.js';

suite('UsefuleServer', async function () {
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

	await test('responds with 415 for unsupported file types', async function () {
		let event: any;
		server.once('file:unsupported_type', data => (event = data));
		const res = await requestFile('bad_files/audio.aiff');

		assert.equal(res.status, 415);
		assert.deepEqual(event, {
			id: event.id,
			requestPath: '/bad_files/audio.aiff',
			targetPath: 'fixtures/bad_files/audio.aiff',
			extension: '.aiff',
		});
	});
	await test('responds with 404 for unexisting files', async function () {
		const [res, event] = await Promise.all([
			requestFile('empty/does_not_exists.txt'),
			once(server, 'file:enoent').then(a => a[0]),
		]);

		assert.equal(res.status, 404);
		assert.deepEqual(event, {
			id: event.id,
			targetPath: 'fixtures/empty/does_not_exists.txt',
			requestPath: '/empty/does_not_exists.txt',
		});
	});
	await test('responds with the actual file', async function (t) {
		const actualContent = await readFile(
			'fixtures/pages/index.html',
			'utf-8',
		);
		const [res, event] = await Promise.all([
			requestFile('pages/index.html'),
			once(server, 'file:sent').then(a => a[0]),
		]);

		assert.equal(res.status, 200);
		assert.deepEqual(event, {
			id: event?.id,
			targetPath: 'fixtures/pages/index.html',
			bytes: Buffer.from(actualContent).byteLength,
			requestPath: '/pages/index.html',
		});
		await t.test('has the correct mime type', function () {
			assert.equal(res.headers.get('Content-Type'), 'text/html');
		});
		await t.test('responds with the actual content', async function () {
			assert.equal(await res.text(), actualContent);
		});
	});
	await test('responds with 500 for a locked file', async function () {
		const [res, event] = await Promise.all([
			requestFile('bad_files/unreadable.json'),
			once(server, 'error').then(a => a[0]),
		]);

		assert.equal(res.status, 500);
		assert.deepEqual(event, {
			id: event.id,
			bytes: event.bytes,
			error: event.error,
			requestPath: '/bad_files/unreadable.json',
			targetPath: 'fixtures/bad_files/unreadable.json',
		});
	});
});
