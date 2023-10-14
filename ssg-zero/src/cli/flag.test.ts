import assert from 'node:assert/strict';
import test from 'node:test';
import { Command } from './flag.js';
import { boolean, number, string } from './decorator.js';

test('reports the usage based on the internal schema', function () {
	class Dev extends Command {
    @boolean({
      description: 'Show version information',
    })
    version?: boolean;

		@boolean({
			short: 'd',
			description: 'Only print out what will been generated',
		})
		dryRun?: boolean;

		@number({ short: 'p', description: 'Port to serve build output on' })
		port: number = 4269;

    @string({ description: 'Caching strategy to use on files'}) 
    cachingMethod: string = 'advanced-btree5'
	}
	const dev = new Dev('Develop a static site');

	const expectedUsage = `\
Usage: ssg-zero dev [OPTIONS]
Develop a static site

Options:
      --version                  Show version information
  -d, --dry-run                  Only print out what will been generated
  -p, --port <number>            Port to serve build output on (default 4269)
      --caching-method <string>  Caching strategy to use on files (default "advanced-btree5")
`;

	assert.equal(dev.usage('ssg-zero'), expectedUsage);
});

test('converts the class name to kebab-case in usage', function () {
	class DoIt extends Command {}
	const doIt = new DoIt('DOOO IT!');

	const expectedUsage = `\
Usage: app do-it [OPTIONS]
DOOO IT!

Options:

`;

	assert.equal(doIt.usage('app'), expectedUsage);
});
