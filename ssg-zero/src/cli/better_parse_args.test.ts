import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parse, number, helpdoc } from './better_parse_args.js';
import { cli as options } from './options.js';

describe('parse number argument', function () {
	test('prevents NaN', function () {
		assert.throws(number.bind(null, 'Text'));
	});
	test('prevents Infinity', function () {
		assert.throws(number.bind(null, '9'.repeat(600)));
	});
	test('parses a float', function () {
		assert.equal(number('3.14'), 3.14);
	});
	test('parses an int', function () {
		assert.equal(number('96'), 96);
	});
});

describe('parse cli', function () {
	const cli = parse.bind(null, options);

	test('parses the default command', function () {
		const args = ['--help', '--config=file.js'];
		const expected = Object.create(null);
		Object.assign(expected, {
			help: true,
			version: undefined,
			config: 'file.js',
		});

		const { command, values } = cli(args);

		assert.equal(command, undefined);
		assert.deepEqual(values, expected);
	});

	test('parses the build command', function () {
		const args = [
			'-h',
			'build',
			'-vcMyFileIsSuperSpecial',
			'--parallel-fs',
			'4',
		];
		const expected = Object.create(null);
		Object.assign(expected, {
			help: true,
			version: true,
			config: 'MyFileIsSuperSpecial',
			'parallel-fs': 4,
		});

		const { command, values } = cli(args);

		assert.equal(command, 'build');
		assert.deepEqual(values, expected);
	});
	test('parses the dev command', function () {
		const args = ['--config', 'build', 'dev', '-f2'];
		const expected = Object.create(null);
		Object.assign(expected, {
			help: undefined,
			version: undefined,
			config: 'build',
			'parallel-fs': 2,
			port: 4269,
		});

		const { command, values } = cli(args);

		assert.equal(command, 'dev');
		assert.deepEqual(values, expected);
	});
	test('parses the serve command', function () {
		const args = ['-v', 'serve', '-hp', '6969'];
		const expected = Object.create(null);
		Object.assign(expected, {
			help: true,
			version: true,
			config: 'zero.config.js',
			port: 6969,
		});

		const { command, values } = cli(args);

		assert.equal(command, 'serve');
		assert.deepEqual(values, expected);
	});
});

describe('generate helpdocs', function () {
	test('formats help for default command', function () {
		const help = helpdoc(options);
		const expected = `\
ssg-zero [Global options] <Command>
Work on your static site

Commands:
build  Build your site
dev    Serve & reactively build your site
serve  Serve your site on localhost

Global Options:
-v, --version        
-h, --help           
-c, --config string  \
`;

		assert.equal(help, expected);
	});
	test('formats help for the serve', function () {
		const help = helpdoc(options, 'serve');
		const expected = `\
ssg-zero [Global options] serve [Options]
Serve your site on localhost

Options:
-p, --port number  \
`;

		assert.equal(help, expected);
	});
});
