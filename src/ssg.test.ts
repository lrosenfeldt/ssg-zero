import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { SSG } from './ssg.js'
import { mkdir, rm } from 'node:fs/promises'
import { exists } from './usefule'

describe('ssg.ts', () => {
	describe('SSG', () => {
		describe('setup', () => {
			const inputDir = 'fixtures/pages_dump'
			const outputDir = 'fixtures/dist_dump'
			const ssg = new SSG(inputDir, outputDir, new Map())

			before(async () => {
				await mkdir(inputDir, { recursive: true })
				await rm(outputDir, { force: true, recursive: true })
			})
			after(async () => {
				await rm(outputDir, { force: true, recursive: true })
			})

			it('setups the output directory', async t => {
				await t.test('has no directories initially', async () => {
					assert.equal(
						await exists(outputDir),
						false,
						`Output directory ${outputDir} on start of the test run.`,
					)
				})

				await t.test('runs successfully', async () => {
					await assert.doesNotReject(async () => await ssg.setup())
				})

				await t.test('creates output directory', async () => {
					assert.equal(
						await exists(outputDir),
						true,
						`Output directory ${outputDir} was not created during setup.`,
					)
				})
			})
		})
	})
})
