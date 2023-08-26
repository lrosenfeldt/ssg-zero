import assert from 'node:assert/strict'
import { after, before, describe, it, mock } from 'node:test'
import { mkdir, readFile, rm } from 'node:fs/promises'

import { SSG, Renderer, SSGBuilder } from './ssg.js'
import { exists } from './usefule.js'
import { join } from 'node:path'
import { LogLevel } from './logger.js'

describe('ssg.ts', () => {
	describe('SSGBuilder', () => {
		const inputDir = 'fixtures/pages'
		const outputDir = 'fixtures/dist'

		const builder = new SSGBuilder()
		const reverseRenderer = mock.fn<Renderer['render']>()

		describe('build', () => {
			it('builds the corresponding ssg', async t => {
				builder
					.setInputDir(inputDir)
					.setOutputDir(outputDir)
					.template('.html', {
						render: reverseRenderer,
						generates: '.txt',
					})
					.passthrough('.css')
					.useDefaultLogger(LogLevel.Error)

				const ssg = builder.build()

				await t.test('builds a ssg', () => {
					assert.equal(
						ssg instanceof SSG,
						true,
						`Returned object ${ssg} is not of type SSG.`,
					)
				})

				await t.test('has the correct input directory', () => {
					assert.equal(ssg.inputDir, inputDir)
				})

				await t.test('has the correct output directory', () => {
					assert.equal(ssg.outputDir, outputDir)
				})

				await t.test('marks .css for passthrough', () => {
					assert.equal(
						ssg.fileHandlers['.css'],
						SSG.passthroughMarker,
					)
				})

				await t.test('wants to render .html to .txt', () => {
					const renderer = ssg.fileHandlers['.html'] as Renderer
					assert.equal(renderer.generates, '.txt')
				})
			})
		})
	})
	describe('SSG', () => {
		describe('setup', () => {
			const inputDir = 'fixtures/pages_dump'
			const outputDir = 'fixtures/dist_dump'
			const ssg = new SSGBuilder()
				.setInputDir(inputDir)
				.setOutputDir(outputDir)
				.useDefaultLogger(LogLevel.Error)
				.build()

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

			const renderHtmlDummy = mock.fn<Renderer['render']>(
				(content, data: { some: string }) =>
					content.replace(/\{\{\s*[^}\s]+\s*\}\}/g, data.some),
			)
			const ssg = new SSGBuilder()
				.setInputDir(inputDir)
				.setOutputDir(outputDir)
				.passthrough('.css')
				.template('.html', renderHtmlDummy)
				.useDefaultLogger(LogLevel.Error)
				.build()

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
						assert.equal(renderHtmlDummy.mock.callCount(), 1)
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
