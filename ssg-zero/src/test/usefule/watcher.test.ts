import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import { mkdir, rm, writeFile } from 'node:fs/promises';

  import { WatchEvent, Watcher } from '../../lib/usefule/watcher.js';

describe('watcher initialization', function () {
	test('fails if not initialized', async function () {
		const watcher = new Watcher('fixtures/watch_static', 0, false);
		await assert.rejects(async () => {
			for await (const _ of watcher.watch()) {
				break;
			}
		});
	});
});

describe('watch events', async function () {
	const baseDir = 'fixtures/watch';
	const watcher = new Watcher(baseDir, 50, false);

	const files = {
		create: {
			filePath: 'fixtures/watch/create.json',
			content: '{"json":"jsml"}',
		},
		change: {
			filePath: 'fixtures/watch/change.json',
			contentBefore: '{"value":68}',
			contentAfter: '{"value":69,"msg":"nice"}',
		},
		delete: {
			filePath: 'fixtures/watch/delete.json',
			content: '[]',
		},
	};

	beforeEach(async () => {
		await rm(baseDir, { recursive: true, force: true });
		await mkdir(baseDir);

		const p1 = writeFile(
			files.change.filePath,
			files.change.contentBefore,
			'utf-8',
		);
		const p2 = writeFile(
			files.delete.filePath,
			files.delete.content,
			'utf-8',
		);

		await Promise.all([p1, p2]);
	});

	const changeFs = async () => {
		const p1 = writeFile(
			files.create.filePath,
			files.create.content,
			'utf-8',
		);
		const p2 = writeFile(
			files.change.filePath,
			files.change.contentAfter,
			'utf-8',
		);
		const p3 = rm(files.delete.filePath);

		await Promise.all([p1, p2, p3]);
	};

	await test('emits the correct events', async function () {
		await watcher.init();
		const timeout = 5_000;
		const expected: WatchEvent[] = [
			{
				type: 'create',
				filePath: files.create.filePath,
				content: files.create.content,
			},
			{
				type: 'change',
				filePath: files.change.filePath,
				content: files.change.contentAfter,
			},
			{ type: 'delete', filePath: files.delete.filePath, content: '' },
		];
		let events: Set<WatchEvent> = new Set();

		changeFs().catch(() =>
			assert.fail(`couldn\'t make changes to base dir ${baseDir}`),
		);

		let start = performance.now();
		for await (const event of watcher.watch()) {
			events.add(event);
			const delta = performance.now() - start;

			if (events.size >= 3 || delta >= timeout) {
				break;
			}
		}

		assert.equal(events.size, 3);
		assert.deepEqual(events, new Set(expected));
	});
});
