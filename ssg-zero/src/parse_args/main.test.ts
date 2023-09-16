import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { Cli } from './main.js';

function promiseWithResolvers(): {
	promise: Promise<void>;
	resolve: () => void;
	reject: () => void;
} {
	let resolve: () => void, reject: () => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve: resolve!, reject: reject! };
}

suite('main.ts', function () {
	test('is cool', async function () {
		const cli = new Cli({
			name: 'ssg-zero',
			description: 'Build a static site',
			version: process.env.npm_package_version ?? 'v42.69',
			args: {},
		});

    const { promise, resolve } = promiseWithResolvers()

		cli.on('help', () => {
      resolve()
    });

    cli.parse()

    await assert.doesNotReject(promise)
	});
});
