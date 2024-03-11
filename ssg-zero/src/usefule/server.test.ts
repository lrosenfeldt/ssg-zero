import assert from 'node:assert/strict';
import { after, before, describe as suite, test } from 'node:test';

import { once } from 'node:events';
import { chmod, readFile } from 'node:fs/promises';

import { UsefuleServer } from './server.js';
import { toHttpDate } from './http_date.js';

suite('UsefuleServer', async function () {
	const server = new UsefuleServer('fixtures', { port: 4269 });
	async function requestFile(
		path: string,
		opts: RequestInit = { method: 'GET' },
	) {
		return await fetch(new URL(path, server.baseUrl), opts);
	}

	before(async function () {
		await chmod('fixtures/bad_files/unreadable.json', 0o0344);
		await server.serve();
	});

	after(async function () {
		await chmod('fixtures/bad_files/unreadable.json', 0o0644);
		await server.stop();
	});

	await test('disallows POST method', async function () {
		let event: any;
		server.once('file:done', data => (event = data));
		const res = await requestFile('pages/index.html', {
			method: 'POST',
		});

		assert.equal(res.status, 405);
		assert.equal(res.headers.get('Allow'), 'GET, HEAD');
		assert.deepEqual(event, {
			id: event.id,
			status: 405,
			accept: ['*/*'],
			filePath: undefined,
		});
	});
	await test('redirects if no extension is provided and trailing slash is missing', async function () {
		let event: any;
		server.once('file:done', data => (event = data));
		const res = await requestFile('pages');

		assert.equal(res.status, 200);
		assert.ok(res.redirected);
		assert.deepEqual(event, {
			id: event.id,
			status: 301,
			accept: ['*/*'],
			filePath: undefined,
		});
	});

	await test('responds with 415 for unsupported file types', async function () {
		let event: any;
		server.once('file:done', data => (event = data));
		const res = await requestFile('bad_files/audio.aiff');

		assert.equal(res.status, 415);
		assert.deepEqual(event, {
			id: event.id,
			status: 415,
			accept: ['*/*'],
			filePath: 'fixtures/bad_files/audio.aiff',
		});
	});
	await test('responds with 404 for unexisting files', async function () {
		const [res, event] = await Promise.all([
			requestFile('empty/does_not_exists.txt'),
			once(server, 'file:done').then(a => a[0]),
		]);

		assert.equal(res.status, 404);
		assert.deepEqual(event, {
			id: event.id,
			status: 404,
			accept: ['*/*'],
			filePath: 'fixtures/empty/does_not_exists.txt',
		});
	});
	await test('responds with the actual file', async function (t) {
		const actualContent = await readFile(
			'fixtures/pages/index.html',
			'utf-8',
		);
		const [res, event] = await Promise.all([
			requestFile('pages/index.html'),
			once(server, 'file:done').then(a => a[0]),
		]);

		assert.equal(res.status, 200);
		assert.deepEqual(event, {
			id: event.id,
			status: 200,
			accept: ['*/*'],
			filePath: 'fixtures/pages/index.html',
			bytes: Buffer.from(actualContent).byteLength,
		});
		await t.test('has the correct mime type', function () {
			assert.equal(res.headers.get('Content-Type'), 'text/html');
		});
		await t.test('responds with the actual content', async function () {
			assert.equal(await res.text(), actualContent);
		});
		await t.test("sets the 'Last-Modified' header", async function () {
			const lastModified = res.headers.get('Last-Modified');
			assert.ok(lastModified);

			const parts = lastModified.split(' ');
			assert.equal(
				parts.length,
				6,
				`A HTTP-Date should have 6 parts, got ${parts.length}`,
			);

			const [weekday, day, month, year, time, gmt] = parts;
			assert.match(weekday, /\w\w\w/);
			assert.match(day, /\d\d/);
			assert.match(month, /\w\w\w/);
			assert.match(year, /\d\d\d\d/);
			assert.match(time, /\d\d:\d\d:\d\d/);
			assert.equal(gmt, 'GMT');
		});
	});
	await test('responds with 500 for a locked file', async function () {
		const [res, error] = await Promise.all([
			requestFile('bad_files/unreadable.json'),
			once(server, 'error').then(a => a[0]),
		]);

		assert.equal(res.status, 500);
		assert.deepEqual(error.meta, {
			id: error.meta.id,
			status: 500,
			accept: ['*/*'],
			filePath: 'fixtures/bad_files/unreadable.json',
		});
	});
	await test('responds with 406 if mime type of file does not match request content', async function () {
		const res = await requestFile('pages/assets/style.css', {
			headers: { accept: 'text/csv' },
		});

		assert.equal(res.status, 406);
		assert.equal(res.headers.get('accept'), 'text/css');
	});
	await test('responds with 304 if the file is unmodified', async function () {
		const date = new Date(Date.UTC(2049, 11, 24, 0, 23, 5));
		const res = await requestFile('pages/assets/style.css', {
			headers: {
				'If-Modified-Since': toHttpDate(new Date(date)),
			},
		});

		assert.equal(res.status, 304);
	});
	await test("responds with 400 if a bad date is send for  'If-Modified-Since' header", async function () {
		const res = await requestFile('pages/assets/style.css', {
			headers: {
				'If-Modified-Since': 'Im blue dabedi dabedei',
			},
		});

		assert.equal(res.status, 400);
	});
});
