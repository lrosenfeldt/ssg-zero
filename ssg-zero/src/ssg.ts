import { basename, dirname, extname, join } from 'node:path';

import { cp, mkdir, writeFile } from 'node:fs/promises';

import { FileEntriesReader, walkFiles } from './usefule/core.js';
import { logger, type Logger } from './logger.js';
import { parse } from './frontmatter.js';

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
			this.logger.debug('Creating directory', {
				file: inputFilePath,
				dir: targetDir,
			});
			await mkdir(targetDir, { recursive: true });

			const targetFile = join(
				targetDir,
				basename(file.filePath).replace(fileType, renderer.generates),
			);
			this.logger.info('Rendering', {
				file: inputFilePath,
				to: targetFile,
			});

			const parsedContent = parse(file.content);
			const outputContent = await renderer.render(
				parsedContent.content,
				parsedContent.data ?? {},
				{ input: inputFilePath, output: targetFile },
			);
			this.logger.debug('Rendering done', {
				file: inputFilePath,
				to: targetFile,
			});
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
