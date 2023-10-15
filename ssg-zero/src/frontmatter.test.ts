import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import {
	type ParserResult,
	UnexpectedEndOfJsonError,
	parse,
} from './frontmatter.js';

suite('parseFrontmatter', function () {
	suite('given en empty text', function () {
		const text = '';
		const result = parse(text);

		test('returns an empty string as content when given an empty text', function () {
			assert.equal(result.content, text);
		});
		test('returns no data when given an empty text', function () {
			assert.equal(result.data, undefined);
		});
	});
	suite('given no frontmatter', function () {
		const text = `\
Roses are red
Violets are blue

Unexpected '{'
at line 32
`;
		const result = parse(text);

		test('returns the full text when given no frontmatter', function () {
			assert.equal(result.content, text);
		});
		test('returns no data when given no frontmatter', function () {
			assert.equal(result?.data, undefined);
		});
	});
	suite('given invalid frontmatter', function () {
		test('ignores frontmatter if preceeded by empty lines', function () {
			const text = `\


{
  "hasFrontmatter": true
}
<main>Look at me!</main>
`;
			const result = parse(text);
			assert.equal(result?.data, undefined);
		});
		test('passes through syntax errors from JSON.parse', function () {
			const text = `\
{
  "color": "red",
  "hex": 0xFF0000
}
<p>Oh no!</p>
`;
			assert.throws(parse.bind(null, text), SyntaxError);
		});
		test('throws on unexpected end of json', function () {
			const text = `\
{
  "unicorn": "awesome",
  "creatures": ["dragon", "goblin", "zombie"],
<p>Oh no!</p>
`;
			assert.throws(
				parse.bind(null, text),
				new UnexpectedEndOfJsonError(text, 0),
			);
		});
	});
	suite('given valid frontmatter', function () {
		test('parses content and fronmatter', async function (t) {
			const text = `\
{
  "number": 69,
  "bool": false,
  "text": "The quick whatever does the thing.",
  "list": [1, 2, 4, 8, 16],
  "nested": {
    "abc": 123
  }
}
Actual content`;
			let result: ParserResult;
			assert.doesNotThrow(() => {
				result = parse(text);
			});
			await t.test('strips the frontmatter from the text', function () {
				assert.equal(result.content, 'Actual content');
			});
			await t.test('contains the correct data', function () {
				const data = result.data;
				assert.deepEqual(data, {
					number: 69,
					bool: false,
					text: 'The quick whatever does the thing.',
					list: [1, 2, 4, 8, 16],
					nested: {
						abc: 123,
					},
				});
			});
		});
		test('parses empty frontmatter and content', async function(t) {
			const text = `\
{
}
<p>Someday everything will be alright</p>
`;
			let result: ParserResult;
			assert.doesNotThrow(() => {
				result = parse(text);
			});
			await t.test('strips frontmatter from the text', function () {
				assert.equal(
					result.content,
					'<p>Someday everything will be alright</p>\n',
				);
			});
			await t.test('contains empty data', function () {
				assert.deepEqual(result.data, {});
			});
		});
	});
});
