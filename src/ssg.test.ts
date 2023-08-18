import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { mkdir, readFile, rm } from 'node:fs/promises'

import { type FileHandler, SSG } from './ssg.js'
import { exists } from './usefule.js'
import { join } from 'node:path'

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

				await t.test('runs twice without problems', async () => {
					await assert.doesNotReject(async () => await ssg.setup())
				})
			})
		})
		describe('build', () => {
			const inputDir = 'fixtures/pages'
			const outputDir = 'fixtures/dist'
			const fileHandler: Map<string, FileHandler> = new Map()
			fileHandler.set('.css', SSG.passthroughMarker)
			const ssg = new SSG(inputDir, outputDir, fileHandler)

			before(async () => {
				await mkdir(inputDir, { recursive: true })
				await rm(outputDir, { force: true, recursive: true })
				await ssg.setup()
			})

			it('builds the pages', async t => {
				await t.test('builds successfully', async () => {
					await assert.doesNotReject(async () => await ssg.build())
				})

				await t.test('copies style.css', async () => {
					const path = 'assets/style.css'
					const originalCss = await readFile(
						join(inputDir, path),
						'utf-8',
					)

					const copiedCssPath = join(outputDir, path)
					const copiedCss = await readFile(copiedCssPath, 'utf-8')

					assert.equal(copiedCss, originalCss)
				})
			})
		})
	})
})
