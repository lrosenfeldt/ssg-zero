import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { UnexpectedEndOfJsonError, parseFrontmatter } from './frontmatter.js';

describe('parseFrontmatter', function () {
	test('returns an empty text and data for empty text', function () {
		const text = '';
		const result = parseFrontmatter(text);
		assert.equal(result.content, text);
		assert.equal(result.data, undefined);
	});

	test('returns the full text and no data when given no frontmatter', function () {
		const text = `\
        Roses are red
      Violets are blue

      Unexpected '{'
        at line 32
        `;
		const result = parseFrontmatter(text);
		assert.equal(result.content, text);
		assert.equal(result?.data, undefined);
	});

	test('ignores frontmatter if preceeded by empty lines', function () {
		const text = `\


{
  "hasFrontmatter": true
}
<main>Look at me!</main>
`;
		const result = parseFrontmatter(text);
		assert.equal(result?.data, undefined);
	});

	test('passes through syntax errors from JSON.parse for invalid frontmatter', function () {
		const text = `\
{
  "color": "red",
  "hex": 0xFF0000
}
<p>Oh no!</p>
`;
		assert.throws(parseFrontmatter.bind(null, text), SyntaxError);
	});

	test('throws on unexpected end of json for invalid frontmatter', function () {
		const text = `\
{
  "unicorn": "awesome",
  "creatures": ["dragon", "goblin", "zombie"],
<p>Oh no!</p>
`;
		assert.throws(
			parseFrontmatter.bind(null, text),
			new UnexpectedEndOfJsonError(text, 0),
		);
	});

	test('parses content and a simple fronmatter', async function () {
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

		const { data, content } = parseFrontmatter(text);

		assert.equal(content, 'Actual content');
		assert.deepEqual(data, {
			number: 69,
			bool: false,
			text: 'The quick whatever does the thing.',
			list: [1, 2, 4, 8, 16],
			nested: {
				abc: 123,
			},
		});

		test('parses empty frontmatter and content', async function () {
			const text = `\
{
}
<p>Someday everything will be alright</p>
`;
			const { content, data } = parseFrontmatter(text);

			assert.equal(
				content,
				'<p>Someday everything will be alright</p>\n',
			);
			assert.deepEqual(data, {});
		});
	});
});
