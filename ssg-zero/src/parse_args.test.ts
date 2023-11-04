import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import {
	boolean,
	number,
	string,
	commands,
	positionals,
	parse,
	description,
} from './parse_args.js';

suite('Parser', function () {
	@description('Build a static site')
	class Build {
		@string({ short: 'h' })
		hashMethod: string = 'none';

		@boolean({ short: 'C' })
		clean?: boolean;

		@number({ short: 't' })
		maxThreads?: number;

		@positionals()
		files?: string[];
	}

	@description('A cli tool')
	class Cli {
		@boolean({ short: 'h' })
		help?: boolean;

		@string({ short: 'c' })
		config: string = 'config.json';

		@number({})
		logLevel: number = 2;

		@commands(Build)
		command: Build | undefined;

		@positionals()
		rest?: string[];
	}

	test('parses arguments with no command', function () {
		const args = [
			'-h',
			'-c',
			'noconfig.json',
			'--log-level',
			'0',
			'--',
			'i',
			'super',
			'-dont',
			'--care',
		];

		const expectedCli = new Cli();
		expectedCli.help = true;
		expectedCli.config = 'noconfig.json';
		expectedCli.logLevel = 0;
		expectedCli.rest = ['i', 'super', '-dont', '--care'];

		assert.deepEqual(parse(Cli, args), expectedCli);
	});

	test('parses arguments with build command', function () {
		const args = [
			'--log-level=nan',
			'-hcmyconfig.json',
			'build',
			'-t3',
			'--hash-method=sha1',
			'--clean',
			'pages/index.html',
			'pages/about.html',
			'pages/assets/styles.css',
		];

		const expectedCli = new Cli();
		const expectedCommand = new Build();
		expectedCli.logLevel = NaN;
		expectedCli.help = true;
		expectedCli.config = 'myconfig.json';

		expectedCli.command = expectedCommand;

		expectedCommand.maxThreads = 3;
		expectedCommand.hashMethod = 'sha1';
		expectedCommand.clean = true;
		expectedCommand.files = [
			'pages/index.html',
			'pages/about.html',
			'pages/assets/styles.css',
		];

		assert.deepEqual(parse(Cli, args), expectedCli);
	});

	test('throws on missing schema', function () {
		@description('')
		class Invalid {
			@commands(Build)
			target?: Build;
		}

		assert.throws(
			parse.bind(null, Invalid, ['--no-build', '--fast', '69']),
			{
				message: /missing a schema/,
			},
		);
	});

	test('throws on missing description', function () {
		class Invalid {
			@boolean({})
			version?: boolean;

			@commands(Build)
			target?: Build;
		}

		assert.throws(
			parse.bind(null, Invalid, ['--no-build', '--fast', '69']),
			{
				message: /missing a description/,
			},
		);
	});

	test('throws on missing schema of subcommand', function () {
		@description('')
		class InvalidCommand {
			foo: string = 'foo';
		}

		@description('')
		class ValidCli {
			@string({})
			unicornName?: string;

			@commands(InvalidCommand)
			target?: InvalidCommand;
		}

		assert.throws(
			parse.bind(null, ValidCli, [
				'--unicorn-name',
				'awesome',
				'invalid-command',
			]),
			{ message: /InvalidCommand/ },
		);
	});

	test('throws on unexpected positional', function () {
    @description('')
		class NoArgs {
			@number({ short: 'c' })
			count: number = 0;
		}

		assert.throws(parse.bind(null, NoArgs, ['--count', '4', '--', 'foo']), {
			message: /unexpected positional/i,
		});
	});

	const table: Array<{
		name: string;
		args: string[];
		expectedMessage: string;
	}> = [
		{
			name: 'throws on an unknown command',
			args: ['--help', 'do-it'],
			expectedMessage: "Found unknown command 'do-it'",
		},
		{
			name: 'throws on an inline value for an unknown option',
			args: ['--config', 'file.json', '--destination=flavor-town'],
			expectedMessage:
				"Tried to set value for unknown option '--destination'",
		},
		{
			name: 'throws if a value is passed to a boolean',
			args: ['--help=True'],
			expectedMessage: "Got unexpected value for '--help'",
		},
		{
			name: 'throws on unknown long option',
			args: ['--config', '1', '--with-unicorns'],
			expectedMessage: "Found unknown option '--with-unicorns'",
		},
		{
			name: 'throws on a missing value for long option',
			args: ['--config'],
			expectedMessage:
				"Expected value for '--config' but reached end of arguments",
		},
		{
			name: 'throws on an unknown alias',
			args: ['--help', 'build', '-A'],
			expectedMessage: "Found unknown alias '-A'",
		},
		{
			name: 'throws on a missing value for a short option',
			args: ['-cfile.json', 'build', '-t'],
			expectedMessage:
				"Expected value for '-t' but reached end of arguments",
		},
		{
			name: 'throws on a unknown alias within a group',
			args: ['build', '-CI'],
			expectedMessage:
				"Found invalid group '-CI', contains unknown alias '-I'",
		},
		{
			name: 'throws on a missing value for short option in a group',
			args: ['build', '--hash-method', 'none', '-Ct'],
			expectedMessage:
				"Expected value for '-t' at end of '-Ct' but reached end of arguments",
		},
		{
			name: 'throws on invalid number',
			args: ['build', '--max-threads', 'everything'],
			expectedMessage: "Given 'everything' is not a valid number",
		},
		{
			name: 'throws on invalid number and reports the group',
			args: ['--help', 'build', '-Ct', '421l'],
			expectedMessage: "Given '421l' is not a valid number",
		},
	];

	for (const { name, args, expectedMessage } of table) {
		test(name, function () {
			assert.throws(
				parse.bind(null, Cli, args),
				new Error(expectedMessage),
			);
		});
	}
});
