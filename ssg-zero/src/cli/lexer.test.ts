import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { Lexeme, Lexed, Lexer, parse } from './lexer.js';
import {
	boolean,
	commands,
	number,
	string,
	SchemaRegistry,
description,
version,
} from './flag.js';

suite('lexer.ts', function () {
  @description('')
	class Dance {
		@string({ short: 'S' })
		style: string = 'breakdance';

		@boolean({})
		fast?: boolean;
	}

  @description('')
  @version('v1.0.0')
	class Cli {
		@string({ short: 'H' })
		happy: string = 'yes';
		@number({ short: 'u' })
		unicorns?: number;
		@boolean({})
		switch?: boolean;
		@number({})
		logLevel: number = 3;
		@number({ short: 's' })
		speed?: number;
		@boolean({ short: 'i' })
		intermediate: boolean = false;
		@boolean({ short: 'A' })
		awesome?: boolean;
		@string({ short: 'c' })
		config: string = 'config.json';
		@string({ short: 'o' })
		outputDir?: string;

	  @commands([new Dance()])
    command?: Dance;
	}

	const registry = SchemaRegistry.fromApp(new Cli());

	suite('parse', function () {
		test('returns only global options if command is left out', function () {
			const args = [
				'--config=myconfig.json',
				'-obuild',
				'--awesome',
				'-u',
				'14',
			];
			const expectedGlobals = new Cli();
			expectedGlobals.config = 'myconfig.json';
			expectedGlobals.outputDir = 'build';
			expectedGlobals.awesome = true;
			expectedGlobals.unicorns = 14;

			const [globals, options] = parse<Cli, Dance>(args, new Cli());

			assert.equal(options, undefined);
			assert.deepEqual(globals, expectedGlobals);
		});
		test('returns global options and commmand options correctly', function () {
			const args = [
				'--config=special_config.json',
				'--switch',
				'--output-dir=build',
				'-u42',
				'dance',
				'-S',
				'rave',
				'--fast',
			];
			const expectedGlobals = new Cli();
			expectedGlobals.config = 'special_config.json';
			expectedGlobals.switch = true;
			expectedGlobals.outputDir = 'build';
			expectedGlobals.unicorns = 42;

			const expectedDanceOptions = new Dance();
			expectedDanceOptions.fast = true;
			expectedDanceOptions.style = 'rave';

			const [globals, danceOptions] = parse<Cli, Dance>(args, new Cli());

			assert.deepEqual(globals, expectedGlobals);
			assert.deepEqual(danceOptions, expectedDanceOptions);
		});
	});

	suite('SchemaRegistry', function () {
		suite('isCommand', function () {
			test('validates a defined command', function () {
				assert.equal(
					registry.isCommand('dance'),
					true,
					'dance should be a known command, but returned false',
				);
			});
			test('returns false for an unknown command', function () {
				assert.equal(
					registry.isCommand('unknown-gibberish'),
					false,
					"unknown-gibberish should't be valid command, but returned true",
				);
			});
		});
	});
	suite('Tokenizer', function () {
		suite('tokenize', function () {
			const lexer = new Lexer(registry);

			test('tokenizes everything after the terminator as positionals', function () {
				const args = ['--', '--unicorn', '--unit=fm', '-cats'];
				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Positional,
						index: 1,
						value: '--unicorn',
					},
					{
						type: Lexed.Positional,
						index: 2,
						value: '--unit=fm',
					},
					{
						type: Lexed.Positional,
						index: 3,
						value: '-cats',
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			test('tokenizes long options and inline values', function () {
				const args = ['--switch', '--happy=yes', '--speed', '4269'];
				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Option,
						index: 0,
						name: 'switch',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 1,
						name: 'happy',
						value: 'yes',
					},
					{
						type: Lexed.Option,
						index: 2,
						name: 'speed',
						value: 4269,
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			test('tokenizes short options', function () {
				const args = ['-u', '4269', '-i'];
				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Option,
						index: 0,
						name: 'unicorns',
						value: 4269,
					},
					{
						type: Lexed.Option,
						index: 2,
						name: 'intermediate',
						value: true,
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			test('tokenizes short options with values', function () {
				const args = [
					'-icflags',
					'-s',
					'3141',
					'-H',
					'9:00',
					'-omain',
					'dance',
					'-Sdisco',
				];
				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Option,
						index: 0,
						name: 'intermediate',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 0,
						name: 'config',
						value: 'flags',
					},
					{
						type: Lexed.Option,
						index: 1,
						name: 'speed',
						value: 3141,
					},
					{
						type: Lexed.Option,
						index: 3,
						name: 'happy',
						value: '9:00',
					},
					{
						type: Lexed.Option,
						index: 5,
						name: 'outputDir',
						value: 'main',
					},
					{
						type: Lexed.Command,
						index: 6,
						name: 'dance',
					},
					{
						type: Lexed.Option,
						index: 7,
						name: 'style',
						value: 'disco',
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			test('tokenizes a command and positionals', function () {
				const args = [
					'-Hyes',
					'dance',
					'--switch',
					'--fast',
					'arg1',
					'something',
				];
				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Option,
						index: 0,
						name: 'happy',
						value: 'yes',
					},
					{
						type: Lexed.Command,
						index: 1,
						name: 'dance',
					},
					{
						type: Lexed.Option,
						index: 2,
						name: 'switch',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 3,
						name: 'fast',
						value: true,
					},
					{
						type: Lexed.Positional,
						index: 4,
						value: 'arg1',
					},
					{
						type: Lexed.Positional,
						index: 5,
						value: 'something',
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			test('tokenizes a full list of options', function () {
				const args = [
					'-unAn',
					'--switch',
					'--log-level',
					'4',
					'-iAs',
					'9000',
					'dance',
					'-S',
					'moshpit',
					'--',
					'-isAu',
				];

				const expectedTokens: Lexeme[] = [
					{
						type: Lexed.Option,
						index: 0,
						name: 'unicorns',
						value: NaN,
					},
					{
						type: Lexed.Option,
						index: 1,
						name: 'switch',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 2,
						name: 'logLevel',
						value: 4,
					},
					{
						type: Lexed.Option,
						index: 4,
						name: 'intermediate',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 4,
						name: 'awesome',
						value: true,
					},
					{
						type: Lexed.Option,
						index: 4,
						name: 'speed',
						value: 9000,
					},
					{
						type: Lexed.Command,
						index: 6,
						name: 'dance',
					},
					{
						type: Lexed.Option,
						index: 7,
						name: 'style',
						value: 'moshpit',
					},
					{
						type: Lexed.Positional,
						index: 10,
						value: '-isAu',
					},
				];

				assert.deepEqual(lexer.lex(args), expectedTokens);
			});
			suite('report problems', function () {
				test('reports problems for inline values', function () {
					const args = [
						'--unknown-endeavours=offshore',
						'--switch=yes',
					];
					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Problem,
							index: 0,
							message:
								"Tried to set a value for unknown option '--unknown-endeavours'",
						},
						{
							type: Lexed.Problem,
							index: 1,
							message: "Got unexpected value for '--switch'",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
				test('reports problems for long options', function () {
					const args = ['--say-what', '--log-level'];

					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Problem,
							index: 0,
							message: "Found unknown option '--say-what'",
						},
						{
							type: Lexed.Problem,
							index: 1,
							message:
								"Expected value for '--log-level' but reached end of arguments",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
				test('report problems for a short', function () {
					const args = ['-l', '-u'];
					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Problem,
							index: 0,
							message: "Found unknown alias '-l'",
						},
						{
							type: Lexed.Problem,
							index: 1,
							message:
								"Expected value for '-u' but reached end of arguments",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
				test('reports problems for a group of shorts', function () {
					const args = ['-nHi', '-Au'];
					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Problem,
							index: 0,
							message:
								"Got invalid group '-nHi', contains unknown alias '-n'",
						},
						{
							type: Lexed.Option,
							index: 1,
							name: 'awesome',
							value: true,
						},
						{
							type: Lexed.Problem,
							index: 1,
							message:
								"Expected value for '-u' at the end of group but reached end of arguments",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
				test('reports problems for a command', function () {
					const args = ['-s42', '--switch', 'worktree'];
					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Option,
							index: 0,
							name: 'speed',
							value: 42,
						},
						{
							type: Lexed.Option,
							index: 1,
							name: 'switch',
							value: true,
						},
						{
							type: Lexed.Problem,
							index: 2,
							message: "Found unknown command 'worktree'",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
				test('reports a type error for a number', function () {
					const args = ['-sfast', '--log-level', 'silent'];
					const expectedTokens: Lexeme[] = [
						{
							type: Lexed.Problem,
							index: 0,
							message:
								"Found invalid value at '-sfast': Given 'fast' is not a valid number",
						},
						{
							type: Lexed.Problem,
							index: 1,
							message:
								"Found invalid value at '--log-level': Given 'silent' is not a valid number",
						},
					];

					assert.deepEqual(lexer.lex(args), expectedTokens);
				});
			});
		});
	});
});
