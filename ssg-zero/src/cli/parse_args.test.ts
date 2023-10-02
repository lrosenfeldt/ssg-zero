import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { Token, TokenType, Tokenizer } from './parse_args.js';

suite('parse_args.ts', function () {
	suite('Tokenizer', function () {
		suite('tokenize', function () {
			const tokenizer = new Tokenizer({
				globals: {
					happy: { type: 'string', short: 'H' },
					unicorns: { type: 'number', short: 'u' },
					switch: { type: 'boolean' },
					'log-level': { type: 'number' },
					speed: { type: 'number', short: 's' },
					intermediate: { type: 'boolean', short: 'i' },
					awesome: { type: 'boolean', short: 'A' },
					config: { type: 'string', short: 'c' },
					'output-dir': { type: 'string', short: 'o' },
				},
				commands: {
          'dance': {},
        },
			});

			test('tokenizes everything after the terminator as positionals', function () {
				const args = ['--', '--unicorn', '--unit=fm', '-cats'];
				const expectedTokens: Token[] = [
					{
						type: TokenType.Positional,
						index: 1,
						value: '--unicorn',
					},
					{
						type: TokenType.Positional,
						index: 2,
						value: '--unit=fm',
					},
					{
						type: TokenType.Positional,
						index: 3,
						value: '-cats',
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			test('tokenizes long options and inline values', function () {
				const args = ['--switch', '--happy=yes', '--speed', '4269'];
				const expectedTokens: Token[] = [
					{
						type: TokenType.Option,
						index: 0,
						name: 'switch',
						value: true,
					},
					{
						type: TokenType.Option,
						index: 1,
						name: 'happy',
						value: 'yes',
					},
					{
						type: TokenType.Option,
						index: 2,
						name: 'speed',
						value: 4269,
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			test('tokenizes short options', function () {
				const args = ['-u', '4269', '-i'];
				const expectedTokens: Token[] = [
					{
						type: TokenType.Option,
						index: 0,
						name: 'unicorns',
						value: 4269,
					},
					{
						type: TokenType.Option,
						index: 2,
						name: 'intermediate',
						value: true,
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			test('tokenizes short options with values', function () {
				const args = ['-icflags', '-s', '3141', '-H', '9:00', '-omain'];
				const expectedTokens: Token[] = [
					{
						type: TokenType.Option,
						index: 0,
						name: 'intermediate',
						value: true,
					},
					{
						type: TokenType.Option,
						index: 0,
						name: 'config',
						value: 'flags',
					},
					{
						type: TokenType.Option,
						index: 1,
						name: 'speed',
						value: 3141,
					},
					{
						type: TokenType.Option,
						index: 3,
						name: 'happy',
						value: '9:00',
					},
					{
						type: TokenType.Option,
						index: 5,
						name: 'output-dir',
						value: 'main',
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			test('tokenizes a command and positionals positional', function () {
				const args = ['-Hyes', 'dance', '--switch'];
				const expectedTokens: Token[] = [
					{
						type: TokenType.Option,
						index: 0,
						name: 'happy',
						value: 'yes',
					},
					{
						type: TokenType.Command,
						index: 1,
						name: 'dance',
					},
					{
						type: TokenType.Option,
						index: 2,
						name: 'switch',
						value: true,
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			test('tokenizes a full list of options', function () {
				const args = [
					'-unAn',
					'--switch',
					'--log-level',
					'4',
					'-iAs',
					'9000',
					'--',
					'-isAu',
				];

				const expectedTokens: Token[] = [
					{
						type: TokenType.Option,
						index: 0,
						name: 'unicorns',
						value: NaN,
					},
					{
						type: TokenType.Option,
						index: 1,
						name: 'switch',
						value: true,
					},
					{
						type: TokenType.Option,
						index: 2,
						name: 'log-level',
						value: 4,
					},
					{
						type: TokenType.Option,
						index: 4,
						name: 'intermediate',
						value: true,
					},
					{
						type: TokenType.Option,
						index: 4,
						name: 'awesome',
						value: true,
					},
					{
						type: TokenType.Option,
						index: 4,
						name: 'speed',
						value: 9000,
					},
					{
						type: TokenType.Positional,
						index: 7,
						value: '-isAu',
					},
				];

				assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
			});
			suite('report problems', function () {
				test('reports problems for inline values', function () {
					const args = [
						'--unknown-endeavours=offshore',
						'--switch=yes',
					];
					const expectedTokens: Token[] = [
						{
							type: TokenType.Problem,
							index: 0,
							message:
								"Tried to set a value for unknown option '--unknown-endeavours'",
						},
						{
							type: TokenType.Problem,
							index: 1,
							message: "Got unexpected value for '--switch'",
						},
					];

					assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
				});
				test('reports problems for long options', function () {
					const args = ['--say-what', '--log-level'];

					const expectedTokens: Token[] = [
						{
							type: TokenType.Problem,
							index: 0,
							message: "Found unknown option '--say-what'",
						},
						{
							type: TokenType.Problem,
							index: 1,
							message:
								"Expected value for '--log-level' but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
				});
        test('report problems for a short', function () {
					const args = ['-l', '-u'];
					const expectedTokens: Token[] = [
						{
							type: TokenType.Problem,
							index: 0,
							message: "Found unknown alias '-l'",
						},
						{
							type: TokenType.Problem,
							index: 1,
							message:
								"Expected value for '-u' but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
        });
				test('reports problems for a group of shorts', function () {
					const args = ['-nHi', '-Au'];
					const expectedTokens: Token[] = [
						{
							type: TokenType.Problem,
							index: 0,
							message:
								"Got invalid group '-nHi', contains unknown alias '-n'",
						},
						{
							type: TokenType.Option,
							index: 1,
							name: 'awesome',
							value: true,
						},
						{
							type: TokenType.Problem,
							index: 1,
							message:
								"Expected value for '-u' at the end of group but reached end of arguments",
						},
					];

					assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
				});
        test('reports problems for a command', function () {
          const args = ['-s42', '--switch', 'worktree'];
          const expectedTokens: Token[] = [
            {
              type: TokenType.Option,
              index: 0,
              name: 'speed',
              value: 42,
            }, {
              type: TokenType.Option,
              index: 1,
              name: 'switch',
              value: true,
            },
            {
              type: TokenType.Problem,
              index: 2,
              message: "Found unknown command 'worktree'",
            }
          ];

          assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
        });
				test('reports a type error for a number', function () {
					const args = ['-sfast', '--log-level', 'silent'];
					const expectedTokens: Token[] = [
						{
							type: TokenType.Problem,
							index: 0,
							message:
								"Expected a number for option '--speed' but got 'fast'",
						},
						{
							type: TokenType.Problem,
							index: 1,
							message:
								"Expected a number for option '--log-level' but got 'silent'",
						},
					];

					assert.deepEqual(tokenizer.tokenize(args), expectedTokens);
				});
			});
		});
	});
});
