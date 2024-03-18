import assert from 'node:assert/strict';
import { after, before, describe, test, mock } from 'node:test';

import { join } from 'node:path';
import { mkdir, readFile, rm } from 'node:fs/promises';

import { SSG, Renderer, config, type RenderFn } from './ssg.js';
import { exists } from './usefule/core.js';

describe('SSG', function () {
	test('setup initializes the directories', async function (t) {
		const inputDir = 'fixtures/pages_dump';
		const outputDir = 'fixtures/dist_dump';
		const ssg = config({
			inputDir,
			outputDir,
			passthrough: [],
			templates: {},
		});

		before(async function () {
			await mkdir(inputDir, { recursive: true });
			await rm(outputDir, { force: true, recursive: true });
		});
		after(async function () {
			await rm(outputDir, { force: true, recursive: true });
		});

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
	test('builds a website', async function (t) {
		const inputDir = 'fixtures/pages';
		const outputDir = 'fixtures/dist';

		const renderHtmlDummy = mock.fn<RenderFn>(
			(content, data: { some: string }) =>
				content.replace(/\{\{\s*[^}\s]+\s*\}\}/g, data.some),
		);
		const ssg = config({
			inputDir,
			outputDir,
			passthrough: ['.css'],
			templates: { '.html': renderHtmlDummy },
		});

		before(async function () {
			await mkdir(inputDir, { recursive: true });
			await rm(outputDir, { force: true, recursive: true });
			await ssg.setup();
		});

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
			const originalCss = await readFile(join(inputDir, path), 'utf-8');

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
				const renderedHtml = await readFile(renderedHtmlPath, 'utf-8');

				assert.match(renderedHtml, /<p>ZONK!<\/p>/);
			},
		);
	});
});
describe('ssg config', function () {
	const inputDir = 'fixtures/pages';
	const outputDir = 'fixtures/dist';

	const renderer = mock.fn<Renderer['render']>();
	test('configures the corresponding ssg', function () {
		const ssg = config({
			inputDir,
			outputDir,
			passthrough: ['.css'],
			templates: {
				'.html': {
					render: renderer,
					generates: '.txt',
				},
				'.txt': renderer,
			},
		});

		assert.equal(ssg.inputDir, inputDir);
		assert.equal(ssg.outputDir, outputDir);
		assert.deepEqual(ssg.fileHandlers['.css'], SSG.passthroughMarker);
		assert.deepEqual(
			ssg.fileHandlers['.html'],
			ssg.fileHandlers['.txt'],
			'config should setup the same renderer for .html and .txt',
		);
	});
});
