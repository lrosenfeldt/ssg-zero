import assert from 'node:assert/strict'
import { after, before, describe, it, mock } from 'node:test'
import { mkdir, readFile, rm } from 'node:fs/promises'

import { type FileHandler, SSG, Renderer } from './ssg.js'
import { exists } from './usefule.js'
import { join } from 'node:path'
import { ConsoleLogger, LogLevel } from './logger.js'

describe('ssg.ts', () => {
	describe('SSG', () => {
		describe('setup', () => {
			const inputDir = 'fixtures/pages_dump'
			const outputDir = 'fixtures/dist_dump'
			const ssg = new SSG(
				inputDir,
				outputDir,
				new Map(),
				new ConsoleLogger(LogLevel.Error),
			)

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

			const htmlDummyRenderer = {
				generates: '.html',
				render: mock.fn(content =>
					content.replace(/\{\{\s*[^}\s]+\s*\}\}/g, 'ZONK!'),
				),
			} satisfies Renderer
			fileHandler.set('.html', htmlDummyRenderer)
			const ssg = new SSG(
				inputDir,
				outputDir,
				fileHandler,
				new ConsoleLogger(LogLevel.Error),
			)

			before(async () => {
				await mkdir(inputDir, { recursive: true })
				await rm(outputDir, { force: true, recursive: true })
				await ssg.setup()
			})

			it('builds the pages', async t => {
				await t.test('builds successfully', async () => {
					await assert.doesNotReject(async () => await ssg.build())
				})

				await t.test('ignores README.md', async () => {
					const readmePath = join(outputDir, 'README.md')

					assert.equal(
						await exists(readmePath),
						false,
						`README.md should be ignored, but appeared in the output directory ${outputDir}.`,
					)
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

				await t.test('renders index.html', async t => {
					await t.test('uses the given renderer', () => {
						assert.equal(
							htmlDummyRenderer.render.mock.callCount(),
							1,
						)
					})

					await t.test('produces rendered output', async () => {
						const renderedHtmlPath = join(outputDir, 'index.html')
						const renderedHtml = await readFile(
							renderedHtmlPath,
							'utf-8',
						)

						assert.match(renderedHtml, /<p>ZONK!<\/p>/)
					})
				})
			})
		})
	})
})
