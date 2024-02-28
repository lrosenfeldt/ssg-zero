import { extname, join } from 'node:path';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

import { walkFiles } from './usefule/core.js';
import { logger, type Logger } from './logger.js';
import { parse } from './frontmatter.js';

const passthroughMarker = Symbol('passthrough');
export type PassthroughMarker = typeof passthroughMarker;

export type Renderer = {
	generates: string;
	render: (content: string, data?: any) => string | Promise<string>;
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

	async build(): Promise<void> {
		for await (const file of walkFiles(this.inputDir)) {
			const inputFilePath = join(file.dir, file.base);
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
			const targetDir = file.dir.replace(this.inputDir, this.outputDir);
			this.logger.debug(
				`Prepare rendering of ${inputFilePath}, creating directory ${targetDir}.`,
			);
			await mkdir(targetDir, { recursive: true });

			const targetFile = join(
				targetDir,
				file.base.replace(fileType, renderer.generates),
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

export class SSGBuilder {
	private inputDir: string = '';
	private outputDir: string = '';
	private fileHandlers: Map<string, FileHandler> = new Map();
	private logger: Logger = logger;

	build(): SSG {
		// TODO: validation, optional properties
		const fileHandlers: Record<string, FileHandler> = {};
		this.fileHandlers.forEach((handler, format) => {
			fileHandlers[format] = handler;
		});

		return new SSG(
			this.inputDir,
			this.outputDir,
			fileHandlers,
			this.logger,
		);
	}

	passthrough(...formats: string[]): this {
		formats.forEach(format =>
			this.fileHandlers.set(format, SSG.passthroughMarker),
		);
		return this;
	}

	template(
		format: string,
		renderOrRenderer: Renderer['render'] | Renderer,
	): this {
		let renderer: Renderer;
		if (typeof renderOrRenderer === 'function') {
			renderer = { render: renderOrRenderer, generates: format };
		} else {
			renderer = renderOrRenderer;
		}

		this.fileHandlers.set(format, renderer);
		return this;
	}

	setInputDir(inputDir: string): this {
		this.inputDir = inputDir;
		return this;
	}

	setOutputDir(outputDir: string): this {
		this.outputDir = outputDir;
		return this;
	}

	// TODO: refactor this, not really compatible with new logger
	useDefaultLogger(_maxLogLevel: any): this {
		return this;
	}
}
