import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { Token, Parsed, Parser, SchemaRegistry } from './parse_args.js';
import { App, Command, boolean, commands, number, string } from './flag.js';

suite('parse_args.ts', function () {
  class Dance extends Command {
    @string({ short: 'S', type: 'string', })
    style: string = 'breakdance'

    @boolean({ type: 'boolean' })
    fast?: boolean
  }

  @commands([new Dance('')])
  class SchemaClass extends App {
      @string({ type: 'string', short: 'H'})
			happy: string = 'yes';
      @number({type: 'number', short: 'u' })
			unicorns?: number;
      @boolean({type: 'boolean'})
			switch?: boolean;
      @number({type: 'number'})
			'log-level': number = 3;
      @number({type: 'number', short: 's'})
			speed?: number;
      @boolean({type: 'boolean', short: 'i' })
			intermediate: boolean = false;
      @boolean({type: 'boolean', short: 'A' })
			awesome?: boolean;
			@string({ type: 'string', short: 'c' })
			config: string = 'config.json';
      @string({ type: 'string', short: 'o' })
			'output-dir'?: string;
  }

	const registry = SchemaRegistry.fromApp(new SchemaClass(''));

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
		suite('getDefaults', function () {
			test('only returns the global defaults when given no command', function () {
				const defaults = registry.getDefaults();

				assert.deepEqual(defaults, {
					config: 'config.json',
					happy: 'yes',
					intermediate: false,
					'log-level': 3,
				});
			});
			test('returns the global defaults and command specific defaults when given a command', function () {
				const defaults = registry.getDefaults('dance');

				assert.deepEqual(defaults, {
					style: 'breakdance',
					config: 'config.json',
					happy: 'yes',
					intermediate: false,
					'log-level': 3,
				});
			});
		});
	});
	suite('Tokenizer', function () {
		suite('tokenize', function () {
			const tokenizer = new Parser(registry);

			test('tokenizes everything after the terminator as positionals', function () {
				const args = ['--', '--unicorn', '--unit=fm', '-cats'];
				const expectedTokens: Token[] = [
					{
						type: Parsed.Positional,
						index: 1,
						value: '--unicorn',
					},
					{
						type: Parsed.Positional,
						index: 2,
						value: '--unit=fm',
					},
					{
						type: Parsed.Positional,
						index: 3,
						value: '-cats',
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
			});
			test('tokenizes long options and inline values', function () {
				const args = ['--switch', '--happy=yes', '--speed', '4269'];
				const expectedTokens: Token[] = [
					{
						type: Parsed.Option,
						index: 0,
						name: 'switch',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 1,
						name: 'happy',
						value: 'yes',
					},
					{
						type: Parsed.Option,
						index: 2,
						name: 'speed',
						value: 4269,
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
			});
			test('tokenizes short options', function () {
				const args = ['-u', '4269', '-i'];
				const expectedTokens: Token[] = [
					{
						type: Parsed.Option,
						index: 0,
						name: 'unicorns',
						value: 4269,
					},
					{
						type: Parsed.Option,
						index: 2,
						name: 'intermediate',
						value: true,
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
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
				const expectedTokens: Token[] = [
					{
						type: Parsed.Option,
						index: 0,
						name: 'intermediate',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 0,
						name: 'config',
						value: 'flags',
					},
					{
						type: Parsed.Option,
						index: 1,
						name: 'speed',
						value: 3141,
					},
					{
						type: Parsed.Option,
						index: 3,
						name: 'happy',
						value: '9:00',
					},
					{
						type: Parsed.Option,
						index: 5,
						name: 'output-dir',
						value: 'main',
					},
					{
						type: Parsed.Command,
						index: 6,
						name: 'dance',
					},
					{
						type: Parsed.Option,
						index: 7,
						name: 'style',
						value: 'disco',
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
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
				const expectedTokens: Token[] = [
					{
						type: Parsed.Option,
						index: 0,
						name: 'happy',
						value: 'yes',
					},
					{
						type: Parsed.Command,
						index: 1,
						name: 'dance',
					},
					{
						type: Parsed.Option,
						index: 2,
						name: 'switch',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 3,
						name: 'fast',
						value: true,
					},
					{
						type: Parsed.Positional,
						index: 4,
						value: 'arg1',
					},
					{
						type: Parsed.Positional,
						index: 5,
						value: 'something',
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
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

				const expectedTokens: Token[] = [
					{
						type: Parsed.Option,
						index: 0,
						name: 'unicorns',
						value: NaN,
					},
					{
						type: Parsed.Option,
						index: 1,
						name: 'switch',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 2,
						name: 'log-level',
						value: 4,
					},
					{
						type: Parsed.Option,
						index: 4,
						name: 'intermediate',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 4,
						name: 'awesome',
						value: true,
					},
					{
						type: Parsed.Option,
						index: 4,
						name: 'speed',
						value: 9000,
					},
					{
						type: Parsed.Command,
						index: 6,
						name: 'dance',
					},
					{
						type: Parsed.Option,
						index: 7,
						name: 'style',
						value: 'moshpit',
					},
					{
						type: Parsed.Positional,
						index: 10,
						value: '-isAu',
					},
				];

				assert.deepEqual(tokenizer.parse(args), expectedTokens);
			});
			suite('report problems', function () {
				test('reports problems for inline values', function () {
					const args = [
						'--unknown-endeavours=offshore',
						'--switch=yes',
					];
					const expectedTokens: Token[] = [
						{
							type: Parsed.Problem,
							index: 0,
							message:
								"Tried to set a value for unknown option '--unknown-endeavours'",
						},
						{
							type: Parsed.Problem,
							index: 1,
							message: "Got unexpected value for '--switch'",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
				test('reports problems for long options', function () {
					const args = ['--say-what', '--log-level'];

					const expectedTokens: Token[] = [
						{
							type: Parsed.Problem,
							index: 0,
							message: "Found unknown option '--say-what'",
						},
						{
							type: Parsed.Problem,
							index: 1,
							message:
								"Expected value for '--log-level' but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
				test('report problems for a short', function () {
					const args = ['-l', '-u'];
					const expectedTokens: Token[] = [
						{
							type: Parsed.Problem,
							index: 0,
							message: "Found unknown alias '-l'",
						},
						{
							type: Parsed.Problem,
							index: 1,
							message:
								"Expected value for '-u' but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
				test('reports problems for a group of shorts', function () {
					const args = ['-nHi', '-Au'];
					const expectedTokens: Token[] = [
						{
							type: Parsed.Problem,
							index: 0,
							message:
								"Got invalid group '-nHi', contains unknown alias '-n'",
						},
						{
							type: Parsed.Option,
							index: 1,
							name: 'awesome',
							value: true,
						},
						{
							type: Parsed.Problem,
							index: 1,
							message:
								"Expected value for '-u' at the end of group but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
				test('reports problems for a command', function () {
					const args = ['-s42', '--switch', 'worktree'];
					const expectedTokens: Token[] = [
						{
							type: Parsed.Option,
							index: 0,
							name: 'speed',
							value: 42,
						},
						{
							type: Parsed.Option,
							index: 1,
							name: 'switch',
							value: true,
						},
						{
							type: Parsed.Problem,
							index: 2,
							message: "Found unknown command 'worktree'",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
				test('reports a type error for a number', function () {
					const args = ['-sfast', '--log-level', 'silent'];
					const expectedTokens: Token[] = [
						{
							type: Parsed.Problem,
							index: 0,
							message:
								"Invalid value for option '--speed': Given 'fast' is not a valid number",
						},
						{
							type: Parsed.Problem,
							index: 1,
							message:
								"Invalid value for option '--log-level': Given 'silent' is not a valid number",
						},
					];

					assert.deepEqual(tokenizer.parse(args), expectedTokens);
				});
			});
		});
	});
});
