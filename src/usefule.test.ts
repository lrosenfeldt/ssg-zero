import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { anyToError, exists } from './usefule.js'

describe('usefule', () => {
	describe('anyToError', () => {
		it('returns the same error', () => {
			const originalError = new Error(
				'Something is wrong, I can feel it.',
			)

			const error = anyToError(originalError)

			assert.equal(originalError, error)
		})

		describe('converts values & functions', () => {
			const table = [
				{ name: 'bigint', value: 69n, pattern: /69/ },
				{ name: 'boolean', value: false, pattern: /false/ },
				{ name: 'function', value: () => void 0, pattern: /function/ },
				{ name: 'null', value: null, pattern: /null/ },
				{ name: 'number', value: 42, pattern: /42/ },
				{ name: 'string', value: 'foo', pattern: /foo/ },
				{ name: 'symbol', value: Symbol(), pattern: /symbol/ },
				{ name: 'undefined', value: undefined, pattern: /undefined/ },
			]

			table.forEach(({ name, value, pattern }) => {
				it(`has ${name} as a cause`, () => {
					const error = anyToError(value)
					assert.equal(error.cause, value)
				})

				it(`reports the value for a ${name}`, () => {
					const error = anyToError(value)
					assert.match(error.message, pattern)
				})
			})
		})

		describe('converts an object', () => {
			it('has the object as cause', () => {
				const obj = { awesome: 'unicorn' }

				const error = anyToError(obj)

				assert.equal(error.cause, obj)
			})

			it('reports its constructor', () => {
				const TestClass = class {
					constructor(public useless: number) {}
				}
				const testThing = new TestClass(-3)

				const error = anyToError(testThing)

				assert.match(error.message, /TestClass/i)
			})
		})
	})
	describe('exists', () => {
		it('resolves to false if a file does not exists', async () => {
			const doesItExist = await exists('fixtures/does/not/exist')
			assert.equal(doesItExist, false)
		})
		it('resolves to true if a file does exist', async () => {
			const doesItExist = await exists('fixtures/pages/index.html')
			assert.equal(doesItExist, true)
		})
	})
})
