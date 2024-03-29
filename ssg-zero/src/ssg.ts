import { basename, dirname, extname, join } from 'node:path';
import { type Readable, Writable } from 'node:stream';
import { cp, mkdir, readFile, writeFile } from 'node:fs';
import { mkdir as mkdirAsync } from 'node:fs/promises';

import { FileReader, anyToError } from './usefule/core.js';
import { logger, type Logger } from './logger.js';
import { ParserResult, parseFrontmatter } from './frontmatter.js';
import { pipeline } from 'node:stream/promises';
import { FileWalker } from './usefule/file_walker.js';

type DoneCallback = (error?: NodeJS.ErrnoException | null | undefined) => void;

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

export class SSG extends Writable {
	static passthroughMarker: PassthroughMarker = passthroughMarker;

	constructor(
		public readonly inputDir: string,
		public readonly outputDir: string,
		public readonly includesDir: string,
		public readonly fileHandlers: Readonly<Record<string, FileHandler>>,
		private logger: Logger,
	) {
		super({ objectMode: true, highWaterMark: 20 });
	}

	async setup(): Promise<void> {
		await mkdirAsync(this.outputDir, { recursive: true });
	}

	_write(
		filePath: any,
		_encoding: BufferEncoding,
		done: (error?: Error | null | undefined) => void,
	): void {
		if (typeof filePath !== 'string') {
			done(
				new Error(
					`Bad configured writable, got chunk of type ${typeof filePath} expected a string.`,
				),
			);
			return;
		}

		const fileType = extname(filePath);
		this.logger.trace('Found file', {
			file: filePath,
			ext: fileType,
		});

		const renderer = this.getFileHandler(fileType);
		if (renderer === undefined) {
			this.logger.info('Ignore file', {
				file: filePath,
				ext: fileType,
			});
			done();
		} else if (renderer === SSG.passthroughMarker) {
			this.passthroughFile(filePath, done);
		} else {
			this.handleTemplate(filePath, fileType, renderer, done);
		}
	}

	async build(
		reader: Readable | FileReader = new FileWalker(this.inputDir),
	): Promise<void> {
		try {
			await pipeline(reader, this);
		} catch (reason) {
			const error = anyToError(reason);
			this.logger.error(error);
		}
	}

	private getFileHandler(extension: string): FileHandler | undefined {
		if (!Object.hasOwn(this.fileHandlers, extension)) {
			return undefined;
		}
		return this.fileHandlers[extension];
	}

	private handleTemplate(
		filePath: string,
		fileType: string,
		renderer: Renderer,
		done: DoneCallback,
	) {
		// setup dir
		const targetDir = dirname(filePath).replace(
			this.inputDir,
			this.outputDir,
		);
		this.logger.debug('Creating directory', {
			file: filePath,
			dir: targetDir,
		});
		mkdir(targetDir, { recursive: true }, error => {
			if (error) {
				done(error);
				return;
			}

			const targetPath = join(
				targetDir,
				basename(filePath).replace(fileType, renderer.generates),
			);
			this.logger.info('Rendering', {
				file: filePath,
				to: targetPath,
			});
			readFile(filePath, 'utf-8', (error, content) => {
				if (error) {
					done(error);
					return;
				}

				try {
					const parsed = parseFrontmatter(content);
					this.renderTemplate(
						filePath,
						targetPath,
						renderer,
						parsed,
						done,
					);
				} catch (error) {
					done(anyToError(error));
				}
			});
		});
	}

	private passthroughFile(filePath: string, done: DoneCallback): void {
		const outputFilePath = filePath.replace(this.inputDir, this.outputDir);
		this.logger.info('Copying file', {
			file: filePath,
			to: outputFilePath,
		});

		cp(
			filePath,
			outputFilePath,
			{
				force: true,
				recursive: true,
			},
			done,
		);
	}

	private renderTemplate(
		filePath: string,
		targetPath: string,
		renderer: Renderer,
		parsed: ParserResult,
		done: DoneCallback,
	): void {
		if (
			parsed.data !== undefined &&
			'layout' in parsed.data &&
			parsed.data.layout !== undefined
		) {
			if (typeof parsed.data.layout !== 'string') {
				const error = new Error(
					`Invalid layout used in ${filePath}, expected a string got '${typeof parsed.data.layout}'`,
				);
				done(error);
				return;
			}

			const layoutExtension = extname(parsed.data.layout);
			const handler = this.getFileHandler(layoutExtension);
			if (handler === undefined || handler === SSG.passthroughMarker) {
				const error = new Error(
					`Invalid layout used in ${filePath}, render is ${handler === undefined ? 'missing' : 'can only copy'}`,
				);
				done(error);
				return;
			}

			const layoutPath = join(this.includesDir, parsed.data.layout);
			this.runRenderer(
				renderer,
				parsed.content,
				parsed.data,
				{ input: filePath, output: targetPath },
				(error, content) => {
					if (error) {
						done(error);
						return;
					}

					readFile(layoutPath, 'utf-8', (error, layoutContent) => {
						if (error) {
							done(error);
							return;
						}

						this.renderTemplate(
							filePath,
							targetPath,
							handler,
							{
								content: layoutContent,
								data: {
									...parsed.data,
									layout: undefined,
									content,
								},
							},
							done,
						);
					});
				},
			);
			return;
		}
		const write = (
			error: NodeJS.ErrnoException | null | undefined,
			output: string,
		) => {
			if (error) {
				done(error);
				return;
			}
			writeFile(targetPath, output, 'utf-8', error => {
				if (error) {
					done(error);
					return;
				}
				this.logger.debug('Rendering done', {
					file: filePath,
					to: targetPath,
				});
				done();
			});
		};

		this.runRenderer(
			renderer,
			parsed.content,
			parsed.data,
			{ input: filePath, output: targetPath },
			write,
		);
	}

	private runRenderer(
		renderer: Renderer,
		template: string,
		data: any,
		meta: Parameters<RenderFn>[2],
		callback: (
			error: NodeJS.ErrnoException | null | undefined,
			output: string,
		) => void,
	): void {
		let rendered: string | Promise<string>;
		try {
			rendered = renderer.render(template, data, meta);
		} catch (reason) {
			const error = anyToError(reason);
			callback(error, '');
			return;
		}

		if (rendered instanceof Promise) {
			rendered
				.then(output => callback(undefined, output))
				.catch(reason => callback(anyToError(reason), ''));
		} else {
			callback(undefined, rendered);
		}
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
