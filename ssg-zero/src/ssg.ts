import { basename, dirname, extname, join } from 'node:path';

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

import { FileEntriesReader, walkFiles } from './usefule/core.js';
import { logger, type Logger } from './logger.js';
import { parse } from './frontmatter.js';

const passthroughMarker = Symbol('passthrough');
export type PassthroughMarker = typeof passthroughMarker;

export type RenderFn = (
	content: string,
	data?: any,
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
		public readonly fileHandlers: Readonly<Record<string, FileHandler>>,
		private logger: Logger,
	) {}

	async setup(): Promise<void> {
		await mkdir(this.outputDir, { recursive: true });
	}

	async build(
		reader: FileEntriesReader = walkFiles(this.inputDir),
	): Promise<void> {
		for await (const file of reader) {
			const inputFilePath = file.filePath;
			const fileType = extname(inputFilePath);
			this.logger.debug(
				`Found file ${inputFilePath} with extension ${fileType}.`,
			);

			const renderer = this.getFileHandler(fileType);
			if (renderer === undefined) {
				this.logger.info(
					`Ignoring file '${inputFilePath}' because of unhandled extension '${fileType}'.`,
				);
				continue;
			}

			if (renderer === SSG.passthroughMarker) {
				await this.passthroughFile(inputFilePath);
				continue;
			}

			// render
			const targetDir = dirname(file.filePath).replace(
				this.inputDir,
				this.outputDir,
			);
			this.logger.debug(
				`Prepare rendering of ${inputFilePath}, creating directory ${targetDir}.`,
			);
			await mkdir(targetDir, { recursive: true });

			const targetFile = join(
				targetDir,
				basename(file.filePath).replace(fileType, renderer.generates),
			);
			this.logger.info(`Rendering ${inputFilePath} to ${targetFile}.`);

			const fileContent = await readFile(inputFilePath, 'utf-8');
			this.logger.debug(
				`Start generating rendered content for ${targetFile}.`,
			);
			const parsedContent = parse(fileContent);
			const outputContent = await renderer.render(
				parsedContent.content,
				parsedContent.data,
			);
			this.logger.debug(
				`Finished generating rendered content for ${targetFile}.`,
			);
			await writeFile(targetFile, outputContent, 'utf-8');
		}
	}

	private getFileHandler(extension: string): FileHandler | undefined {
		if (!Object.hasOwn(this.fileHandlers, extension)) {
			return undefined;
		}
		return this.fileHandlers[extension];
	}

	private async passthroughFile(filePath: string): Promise<void> {
		const outputFilePath = filePath.replace(this.inputDir, this.outputDir);
		this.logger.info(`Copying file '${filePath}' to '${outputFilePath}'.`);

		await cp(filePath, outputFilePath, {
			force: true,
			recursive: true,
		});
		return;
	}
}

export type SSGConfig = {
	inputDir: string;
	outputDir: string;
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

	const ssg = new SSG(cfg.inputDir, cfg.outputDir, fileHandlers, logger);
	return ssg;
}
