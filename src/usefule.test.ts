import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { exists } from './usefule.js'

describe('usefule', () => {
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
