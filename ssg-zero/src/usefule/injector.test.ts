import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { type Readable } from 'node:stream';

import { Injector } from './injector.js';
import { finished } from 'node:stream/promises';

suite('Injector', function () {
	test('passes through chunks that do not contain the pattern', async function () {
		const chunks = [
			'Never',
			' ',
			'gonna',
			' ',
			'give',
			' ',
			'you',
			' ',
			'up',
		];
		const injector = new Injector('</body>', 'Never gonna let you down');

		for (const chunk of chunks) {
			injector.write(Buffer.from(chunk));
		}
		injector.end();

		const [str] = await injector.toArray();

		assert.deepEqual(str, 'Never gonna give you up');
	});
	test('injects after the pattern', async function () {
		const chunks = [
			'<body>',
			'<h1>This is a heading</h1>',
			'<main>This is the meat.</main>',
			'</bo',
			'dy>',
		];
		const injector = new Injector('</body>', '<!-- html comment -->');
		const expected =
			'<body><h1>This is a heading</h1><main>This is the meat.</main></body><!-- html comment -->';

		for (const chunk of chunks) {
			injector.write(Buffer.from(chunk));
		}
		injector.end();
		const [str] = await injector.toArray();

		assert.deepEqual(str, expected);
	});
});
