import assert from 'node:assert/strict';
import { describe, test, mock } from 'node:test';

import {
	boolean,
	number,
	string,
	command,
	cli,
	subcommand,
	positionals,
	parse,
} from '../lib/parse_args.js';

describe('parse_args.ts: decorators', function () {
	test('fails if @cli is used twice', function () {
		assert.throws(() => {
			@cli({ desc: 'foo' })
			@cli({ desc: 'foofoo' })
			class Foo {}
		}, /use '@cli' only once/i);
	});

	test('fails if @command is used twice', function () {
		assert.throws(() => {
			@command({ desc: 'foo' })
			@command({ desc: 'foofoo' })
			class Bar {}
		}, /use '@command' only once/i);
	});

	test('fails if @subcommand is used on unregistered class', function () {
		assert.throws(() => {
			@command({ desc: 'Provide help' })
			class Help {
				@boolean({})
				summary?: boolean;
			}

			class Baz {
				@subcommand([Help])
				command?: Help;
			}

			new Baz();
		}, /use '@command' to register/i);
	});

	test('fails on if @subcommand is passed an unregistered class', function () {
		assert.throws(function () {
			class Diff {
				@number({})
				tabsize: number = 4;
			}

			@cli({ desc: 'git gud' })
			class Git {
				@subcommand([Diff])
				command?: Diff;
			}
		});
	});

	test('fails if @positionals is used on unregistered class', function () {
		assert.throws(() => {
			class Cat {
				@positionals()
				command?: string[];
			}

			new Cat();
		}, /use '@command' to register/i);
	});

	test('fails if a flag decorator is used on unregistered class', function () {
		assert.throws(() => {
			class Echo {
				@boolean({ short: 'n' })
				noNewLine?: boolean;
			}

			new Echo();
		}, /use '@command' to register/i);
	});

	const decoratorContextMock: ClassFieldDecoratorContext<{}, any> & {
		name: string;
	} = {
		kind: 'field',
		addInitializer: mock.fn(),
		name: 'icedTea',
		static: false,
		private: false,
		access: {
			get: mock.fn(),
			has: mock.fn(),
			set: mock.fn(),
		},
		metadata: undefined,
	};

	test('sets helpful names within boolean flag decorator', function () {
		const decorator = boolean({});
		assert.equal(decorator.name, 'booleanFlagDecorator');

		const init = decorator(undefined, decoratorContextMock);
		assert.equal(init.name, 'onInitIcedTeaAsBoolean');
	});

	test('sets helpful names within number flag decorator', function () {
		const decorator = number({});
		assert.equal(decorator.name, 'numberFlagDecorator');

		const init = decorator(undefined, decoratorContextMock);
		assert.equal(init.name, 'onInitIcedTeaAsNumber');
	});
});

describe('parse_args.ts: parse', function () {
	test('disallows arbitrary class to be passed in', function () {
		class Foo {
			foo: string = 'foo';
		}

		assert.throws(
			parse.bind(null, Foo, ['bar']),
			/can't use arbitrary class/i,
		);
	});

	test('disallows command to be passed in', function () {
		@command({ desc: 'bar, not foo' })
		class Bar {
			bar: number = 69;
		}

		assert.throws(parse.bind(null, Bar, []), /use the '@cli' decorator/i);
	});

	@command({ desc: 'Build a static site' })
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

	@command({ desc: 'Provide help' })
	class Help {
		@boolean({ short: 'C' })
		concise: boolean = false;
	}

	@cli({ desc: 'A cli tool' })
	class Cli {
		@boolean({ short: 'h' })
		help?: boolean;

		@string({ short: 'c' })
		config: string = 'config.json';

		@number({})
		logLevel: number = 2;

		@subcommand([Build, Help])
		command: Build | Help | undefined;

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
		{
			name: 'throws on unexpected positional',
			args: ['--config', 'empty.ini', 'help', '-C', 'input'],
			expectedMessage: "Got unexpected positional 'input'",
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
