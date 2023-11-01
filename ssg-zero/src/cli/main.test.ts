import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import {
	type FlagParser,
	boolean,
	command,
	number,
	parse,
	string,
	typedFlag,
} from './main.js';

suite('typedFlag', function () {
	// custom dummy flag type
	const icedTea: FlagParser = function (value, _arg, _group) {
		return value;
	};

	const dummyDecoratorContext: ClassFieldDecoratorContext<any, any> & {
		name: string;
	} = {
		name: 'coldDrink',
		addInitializer() {
			return;
		},
	} as any;

	test('sets decorator name based on the name of flagParser', function () {
		const decorator = typedFlag(icedTea, {});
		assert.equal(decorator.name, 'icedTeaFlagDecorator');
	});
	test('sets name for the field initializer based on the type and field name', function () {
		const fieldInitializer = typedFlag(icedTea, {})(
			undefined,
			dummyDecoratorContext,
		);

		assert.equal(fieldInitializer!.name, 'onInitColdDrinkAsIcedTea');
	});
});

suite('parse', function () {
	class Build {
		@boolean({
			short: 's',
			description: 'Print statistic for generated files',
		})
		stats?: boolean;

		@string({ short: 'c', description: 'Relative path to config file' })
		config: string = 'config.json';

		@number({ description: 'Number of threads to use' })
		concurrency?: number;
	}

	class Serve {
		@boolean({ short: 's', description: 'Use https encryption' })
		secure?: boolean;

		@number({ short: 'p', description: 'Port to serve build output on' })
		port: number = 4269;

		@string({ short: 'C', description: 'Method to use for file hashing' })
		cachingMethod: string = 'advanced-btree5';
	}

	class Cli {
		@boolean({ short: 'h', description: 'Show this message' })
		help?: boolean;

		@number({ description: 'Verbosity of log output' })
		logLevel: number = 2;

		@command([Build, Serve])
		command?: Build | Serve;
	}

	test('parses arguments with serve command', function () {
		const args = [
			'-h',
			'--log-level=1',
			'serve',
			'-p3333',
			'--caching-method',
			'string-compare',
		];

		const expectedServe = new Serve();
		expectedServe.port = 3333;
		expectedServe.cachingMethod = 'string-compare';

		const expectedCli = new Cli();
		expectedCli.command = expectedServe;
		expectedCli.help = true;
		expectedCli.logLevel = 1;

		assert.deepEqual(parse(args, Cli), expectedCli);
	});

	test('parses arguments with build command', function () {
		const args = [
			'--log-level',
			'9000',
			'build',
			'-scFile.json',
			'--concurrency',
			'nan',
		];

		const expectedBuild = new Build();
		expectedBuild.stats = true;
		expectedBuild.config = 'File.json';
		expectedBuild.concurrency = NaN;

		const expectedCli = new Cli();
		expectedCli.command = expectedBuild;
		expectedCli.logLevel = 9000;

		assert.deepEqual(parse(args, Cli), expectedCli);
	});

	test('throws if given invalid cli', function () {
		class Invalid {
			foo: string = 'foo';
		}

		assert.throws(parse.bind(null, [], Invalid));
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
			args: ['--log-level', '1', '--destination=flavor-town'],
			expectedMessage:
				"Tried to set a value for unknown option '--destination'",
		},
		{
			name: 'throws if a value is passed to a boolean',
			args: ['--help=True'],
			expectedMessage: "Got unexpected value for '--help'",
		},
		{
			name: 'throws on unknown long option',
			args: ['--log-level', '1', '--with-unicorns'],
			expectedMessage: "Found unknown option '--with-unicorns'",
		},
		{
			name: 'throws on a missing value for long option',
			args: ['--log-level'],
			expectedMessage:
				"Expected value for '--log-level' but reached end of arguments",
		},
		{
			name: 'throws on an unknown alias',
			args: ['--help', 'serve', '-c'],
			expectedMessage: "Found unknown alias '-c'",
		},
		{
			name: 'throws on a missing value for a short option',
			args: ['--log-level', '3', 'serve', '-C'],
			expectedMessage:
				"Expected value for '-C' but reached end of arguments",
		},
		{
			name: 'throws on a unknown alias within a group',
			args: ['build', '-sI'],
			expectedMessage:
				"Got invalid group '-sI', contains unknown alias '-I'",
		},
		{
			name: 'throws on a missing value for short option in a group',
			args: ['build', '--concurrency', 'nan', '-sc'],
			expectedMessage:
				"Expected value for '-c' at the end of group but reached end of arguments",
		},
		{
			name: 'throws on invalid number',
			args: ['build', '--concurrency', 'everything'],
			expectedMessage:
				"Found invalid number 'everything' for '--concurrency'",
		},
		{
			name: 'throws on invalid number and reports the group',
			args: ['--help', 'serve', '-sp', '421l'],
			expectedMessage:
				"Found invalid number '421l' for '-p' in '-sp'",
		},
	];

	for (const { name, args, expectedMessage } of table) {
		test(name, function () {
			assert.throws(
				parse.bind(null, args, Cli),
				new Error(expectedMessage),
			);
		});
	}
});
