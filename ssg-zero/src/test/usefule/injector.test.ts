import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { Injector } from '../../lib/usefule/injector.js';

describe('Injector', function () {
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
	test('replaces the pattern only once', async function () {
		const injector = new Injector(
			'</p>',
			'<script>alert("Hello");</script>',
		);
		const chunks = [
			'<!DOCTYPE html>\n<html><body>',
			'<nav>The navigation</nav>\n<main><p>Some content</p></main><p>Some more content</p></body>',
			'</html>',
		];
		const expected =
			'<!DOCTYPE html>\n<html><body><nav>The navigation</nav>\n<main><p>Some content</p><script>alert("Hello");</script></main><p>Some more content</p></body></html>';

		for (const chunk of chunks) {
			injector.write(Buffer.from(chunk));
		}
		injector.end();

		const [str] = await injector.toArray();

		assert.equal(str, expected);
	});
});
