import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	type ParserResult,
	UnexpectedEndOfJsonError,
	parse,
} from './frontmatter.js'

describe('frontmatter.ts', () => {
	describe('parseFrontmatter', () => {
		describe('given an empty text', () => {
			const text = ''
			const result = parse(text)
			it('returns an empty string as content', () => {
				assert.equal(result.content, text)
			})
			it('returns no data', () => {
				assert.equal(result.data, undefined)
			})
		})
		describe('given no frontmatter', () => {
			const text = `\
Roses are red
Violets are blue

Unexpected '{'
at line 32
`
			const result = parse(text)
			it('returns the full text', () => {
				assert.equal(result.content, text)
			})
			it('returns no data', () => {
				assert.equal(result?.data, undefined)
			})
		})
		describe('given invalid frontmatter', () => {
			it('ignores frontmatter if preceeded by empty lines', () => {
				const text = `\


{
  "hasFrontmatter": true
}
<main>Look at me!</main>
`
				const result = parse(text)
				assert.equal(result?.data, undefined)
			})
			it('passes through syntax errors from JSON.parse', () => {
				const text = `\
{
  "color": "red",
  "hex": 0xFF0000
}
<p>Oh no!</p>
`
				assert.throws(parse.bind(null, text), SyntaxError)
			})
			it('throws on unexpected end of json', () => {
				const text = `\
{
  "unicorn": "awesome",
  "creatures": ["dragon", "goblin", "zombie"],
<p>Oh no!</p>
`
				assert.throws(
					parse.bind(null, text),
					new UnexpectedEndOfJsonError(text, 0),
				)
			})
		})
		describe('given valid frontmatter', () => {
			it('parses content and fronmatter', async t => {
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
Actual content`
				let result: ParserResult
				assert.doesNotThrow(() => {
					result = parse(text)
				})
				await t.test('strips the frontmatter from the text', () => {
					assert.equal(result.content, 'Actual content')
				})
				await t.test('contains the correct data', () => {
					const data = result.data
					assert.deepEqual(data, {
						number: 69,
						bool: false,
						text: 'The quick whatever does the thing.',
						list: [1, 2, 4, 8, 16],
						nested: {
							abc: 123,
						},
					})
				})
			})
			it('parses empty frontmatter and content', async t => {
				const text = `\
{
}
<p>Someday everything will be alright</p>
`
				let result: ParserResult
				assert.doesNotThrow(() => {
					result = parse(text)
				})
				await t.test('strips frontmatter from the text', () => {
					assert.equal(
						result.content,
						'<p>Someday everything will be alright</p>\n',
					)
				})
				await t.test('contains empty data', () => {
					assert.deepEqual(result.data, {})
				})
			})
		})
	})
})
