import assert from 'node:assert/strict';
import test from 'node:test';
import { Command } from './flag.js';
import { boolean, number } from './decorator.js';

test('reports the usage based on the internal schema', function () {
	class Dev extends Command {
		@boolean({
			short: 'd',
			description: 'Only print out what will been generated',
		})
		dryRun?: boolean;

		@number({ short: 'p', description: 'Port to serve build output on' })
		port: number = 4269;
	}
	const dev = new Dev('Develop a static site');

	const expectedUsage = `\
Usage: app dev [OPTIONS]
Develop a static site

Options:
  -d, --dry-run        Only print out what will been generated
  -p, --port <number>  Port to serve build output on (default 4269)
`;

	assert.equal(dev.usage(), expectedUsage);
});

test('converts the class name to kebab-case in usage', function () {
	class DoIt extends Command {}
	const doIt = new DoIt('DOOO IT!');

	const expectedUsage = `\
Usage: app do-it [OPTIONS]
DOOO IT!

Options:

`;

	assert.equal(doIt.usage(), expectedUsage);
});
