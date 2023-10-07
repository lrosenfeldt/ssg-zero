import assert from 'node:assert/strict';
import test from 'node:test';

import { appSchema, App } from './app.js';

test('App.usage returns a string with usage information', function () {
	const app = new App(
		'ssg-zero',
		'A toolkit to build static sites.',
		appSchema,
	);

	const expectedUsage = `\
Usage: ssg-zero [OPTIONS] COMMAND

A toolkit to build static sites.

Commands:
  dev

Global Options:
  -h,--help     desc
     --version  desc

Run 'ssg-zero COMMAND --help' for more information on a command.
`;

	assert.equal(app.usage(), expectedUsage);
});
