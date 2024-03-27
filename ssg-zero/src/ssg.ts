import { basename, dirname, extname, join } from 'node:path';

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

import { FileReader, walkFiles } from './usefule/core.js';
import { logger, type Logger } from './logger.js';
import { parseFrontmatter } from './frontmatter.js';
import { Queue } from './queue.js';

const passthroughMarker = Symbol('passthrough');
export type PassthroughMarker = typeof passthroughMarker;

export type RenderFn = (
	content: string,
	data: any,
	meta: { input: string; output: string },
) => string | Promise<string>;
export type Renderer = {
	generates: string;
	render: RenderFn;
};

export type FileHandler = PassthroughMarker | Renderer;

export class SSG {
	static passthroughMarker: PassthroughMarker = passthroughMarker;

	constructor(
		public readonly inputDir: string,
		public readonly outputDir: string,
		public readonly includesDir: string,
		public readonly fileHandlers: Readonly<Record<string, FileHandler>>,
		private logger: Logger,
	) {}

	async setup(): Promise<void> {
		await mkdir(this.outputDir, { recursive: true });
	}

	async build(reader: FileReader = walkFiles(this.inputDir)): Promise<void> {
		const queue = new Queue(
			async (path: string) => await this.handleFile(path),
			20,
		);
		for await (const inputFilePath of reader) {
			queue.push(inputFilePath);
		}

		await queue.drain();
	}

	private async handleFile(inputFilePath: string): Promise<void> {
		const fileType = extname(inputFilePath);
		this.logger.trace('Found file', {
			file: inputFilePath,
			ext: fileType,
		});

		const renderer = this.getFileHandler(fileType);
		if (renderer === undefined) {
			this.logger.info('Ignore file', {
				file: inputFilePath,
				ext: fileType,
			});
			return;
		}

		if (renderer === SSG.passthroughMarker) {
			await this.passthroughFile(inputFilePath);
			return;
		}

		// render
		await this.renderTemplate(inputFilePath, fileType, renderer);
	}

	private getLayoutRendererOrFail(
		filePath: string,
		data: {
			layout: any;
		},
	): Renderer {
		if (typeof data.layout !== 'string') {
			const error = new Error(
				`Invalid layout used in ${filePath}, expected a string got '${typeof data.layout}'`,
			);
			this.logger.error(error.message, {
				template: filePath,
				layout: data.layout,
			});
			throw error;
		}

		const layoutExtension = extname(data.layout);
		const handler = this.getFileHandler(layoutExtension);
		if (handler === undefined || handler === passthroughMarker) {
			const error = new Error(
				`Invalid layout used in ${filePath}, render is ${handler === undefined ? 'missing' : 'can only copy'}`,
			);
			this.logger.error(error.message, {
				template: filePath,
				layoutExtension,
			});
			throw error;
		}
		return handler;
	}

	private getFileHandler(extension: string): FileHandler | undefined {
		if (!Object.hasOwn(this.fileHandlers, extension)) {
			return undefined;
		}
		return this.fileHandlers[extension];
	}

	private async passthroughFile(filePath: string): Promise<void> {
		const outputFilePath = filePath.replace(this.inputDir, this.outputDir);
		this.logger.info('Copying file', {
			file: filePath,
			to: outputFilePath,
		});

		await cp(filePath, outputFilePath, {
			force: true,
			recursive: true,
		});
		return;
	}

	private async renderTemplate(
		filePath: string,
		fileType: string,
		renderer: Renderer,
	): Promise<void> {
		// setup dir
		const targetDir = dirname(filePath).replace(
			this.inputDir,
			this.outputDir,
		);
		this.logger.debug('Creating directory', {
			file: filePath,
			dir: targetDir,
		});
		await mkdir(targetDir, { recursive: true });

		const targetFile = join(
			targetDir,
			basename(filePath).replace(fileType, renderer.generates),
		);
		this.logger.info('Rendering', {
			file: filePath,
			to: targetFile,
		});
		const fullContent = await readFile(filePath, 'utf-8');
		const parsedContent = parseFrontmatter(fullContent);

		let output: string;
		if (
			parsedContent.data !== undefined &&
			'layout' in parsedContent.data
		) {
			const layoutRenderer = this.getLayoutRendererOrFail(
				filePath,
				parsedContent.data,
			);
			const layoutFilePath = join(
				this.includesDir,
				parsedContent.data.layout as string,
			);
			const layoutContent = await readFile(layoutFilePath, 'utf-8');
			const renderedContent = await renderer.render(
				parsedContent.content,
				parsedContent.data,
				{ input: filePath, output: targetFile },
			);
			output = await layoutRenderer.render(
				layoutContent,
				{
					...parsedContent.data,
					layout: undefined,
					content: renderedContent,
				},
				{ input: layoutFilePath, output: targetFile },
			);
		} else {
			output = await renderer.render(
				parsedContent.content,
				parsedContent.data,
				{ input: filePath, output: targetFile },
			);
		}

		await writeFile(targetFile, output, 'utf-8');
		this.logger.debug('Rendering done', {
			file: filePath,
			to: targetFile,
		});
	}
}

export type SSGConfig = {
	inputDir: string;
	outputDir: string;
	includesDir: string;
	passthrough: string[];
	templates: {
		[input: string]: Renderer | RenderFn;
	};
};

export function config(cfg: SSGConfig): SSG {
	const fileHandlers: Record<string, FileHandler> = Object.create(null);
	for (const extension of cfg.passthrough) {
		fileHandlers[extension] = passthroughMarker;
	}
	for (const extension in cfg.templates) {
		const renderer = cfg.templates[extension];
		if (typeof renderer === 'function') {
			fileHandlers[extension] = {
				generates: extension,
				render: renderer,
			};
		} else {
			fileHandlers[extension] = renderer;
		}
	}

	const ssg = new SSG(
		cfg.inputDir,
		cfg.outputDir,
		cfg.includesDir,
		fileHandlers,
		logger,
	);
	return ssg;
}
