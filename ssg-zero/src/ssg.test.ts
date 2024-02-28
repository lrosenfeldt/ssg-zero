import assert from 'node:assert/strict';
import { after, before, describe as suite, test, mock } from 'node:test';

import { join } from 'node:path';
import { mkdir, readFile, rm } from 'node:fs/promises';

import { SSG, Renderer, SSGBuilder } from './ssg.js';
import { exists } from './usefule/core.js';

suite('SSGBuilder', function () {
	const inputDir = 'fixtures/pages';
	const outputDir = 'fixtures/dist';

	const builder = new SSGBuilder();
	const reverseRenderer = mock.fn<Renderer['render']>();

	suite('build', function () {
		test('builds the corresponding ssg', async function (t) {
			builder
				.setInputDir(inputDir)
				.setOutputDir(outputDir)
				.template('.html', {
					render: reverseRenderer,
					generates: '.txt',
				})
				.passthrough('.css')
				.useDefaultLogger(4);

			const ssg = builder.build();

			await t.test('builds a ssg', function () {
				assert.equal(
					ssg instanceof SSG,
					true,
					`Returned object ${ssg} is not of type SSG.`,
				);
			});

			await t.test('has the correct input directory', function () {
				assert.equal(ssg.inputDir, inputDir);
			});

			await t.test('has the correct output directory', function () {
				assert.equal(ssg.outputDir, outputDir);
			});

			await t.test('marks .css for passthrough', function () {
				assert.equal(ssg.fileHandlers['.css'], SSG.passthroughMarker);
			});

			await t.test('wants to render .html to .txt', function () {
				const renderer = ssg.fileHandlers['.html'] as Renderer;
				assert.equal(renderer.generates, '.txt');
			});
		});
	});
});
suite('SSG', function () {
	suite('setup', function () {
		const inputDir = 'fixtures/pages_dump';
		const outputDir = 'fixtures/dist_dump';
		const ssg = new SSGBuilder()
			.setInputDir(inputDir)
			.setOutputDir(outputDir)
			.useDefaultLogger(4)
			.build();

		before(async function () {
			await mkdir(inputDir, { recursive: true });
			await rm(outputDir, { force: true, recursive: true });
		});
		after(async function () {
			await rm(outputDir, { force: true, recursive: true });
		});

		test('setups the output directory', async function (t) {
			await t.test('has no directories initially', async function () {
				assert.equal(
					await exists(outputDir),
					false,
					`Output directory ${outputDir} on start of the test run.`,
				);
			});

			await t.test('runs successfully', async function () {
				await assert.doesNotReject(async () => await ssg.setup());
			});

			await t.test('creates output directory', async function () {
				assert.equal(
					await exists(outputDir),
					true,
					`Output directory ${outputDir} was not created during setup.`,
				);
			});

			await t.test('runs twice without problems', async function () {
				await assert.doesNotReject(async () => await ssg.setup());
			});
		});
	});
	suite('build', function () {
		const inputDir = 'fixtures/pages';
		const outputDir = 'fixtures/dist';

		const renderHtmlDummy = mock.fn<Renderer['render']>(
			(content, data: { some: string }) =>
				content.replace(/\{\{\s*[^}\s]+\s*\}\}/g, data.some),
		);
		const ssg = new SSGBuilder()
			.setInputDir(inputDir)
			.setOutputDir(outputDir)
			.passthrough('.css')
			.template('.html', renderHtmlDummy)
			.useDefaultLogger(4)
			.build();

		before(async function () {
			await mkdir(inputDir, { recursive: true });
			await rm(outputDir, { force: true, recursive: true });
			await ssg.setup();
		});

		test('builds the pages', async function (t) {
			await t.test('builds successfully', async function () {
				await assert.doesNotReject(async () => await ssg.build());
			});

			await t.test('ignores README.md', async function () {
				const readmePath = join(outputDir, 'README.md');

				assert.equal(
					await exists(readmePath),
					false,
					`README.md should be ignored, but appeared in the output directory ${outputDir}.`,
				);
			});

			await t.test('copies style.css', async function () {
				const path = 'assets/style.css';
				const originalCss = await readFile(
					join(inputDir, path),
					'utf-8',
				);

				const copiedCssPath = join(outputDir, path);
				const copiedCss = await readFile(copiedCssPath, 'utf-8');

				assert.equal(copiedCss, originalCss);
			});

			await t.test('uses the given renderer on index.html', function () {
				assert.equal(renderHtmlDummy.mock.callCount(), 1);
			});

			await t.test(
				'produces rendered output for index.html',
				async function () {
					const renderedHtmlPath = join(outputDir, 'index.html');
					const renderedHtml = await readFile(
						renderedHtmlPath,
						'utf-8',
					);

					assert.match(renderedHtml, /<p>ZONK!<\/p>/);
				},
			);
		});
	});
});
