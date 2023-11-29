import { Stats } from 'node:fs';
import { type FileHandle, constants, open, stat } from 'node:fs/promises';
import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
} from 'node:http';
import { extname, join } from 'node:path';

import { anyToError } from './core.js';
import { ConsoleLogger, LogLevel, Logger } from '../logger.js';

type MimeTypeInfo = {
	mimeType: string;
	encoding: BufferEncoding;
};

export class UsefuleServer {
	public static readonly mime: Record<string, MimeTypeInfo> = {
		'': { mimeType: 'text/plain', encoding: 'utf-8' },
		'.aac': { mimeType: 'audio/aac', encoding: 'base64' },
		'.abw': { mimeType: 'application/x-abiword', encoding: 'binary' },
		'.arc': { mimeType: 'application/x-freearc', encoding: 'binary' },
		'.avif': { mimeType: 'image/avif', encoding: 'base64' },
		'.avi': { mimeType: 'video/x-msvideo', encoding: 'base64' },
		'.azw': {
			mimeType: 'application/vnd.amazon.ebook',
			encoding: 'base64',
		},
		'.bin': { mimeType: 'application/octet-stream', encoding: 'base64' },
		'.bmp': { mimeType: 'image/bmp', encoding: 'base64' },
		'.bz': { mimeType: 'application/x-bzip', encoding: 'base64' },
		'.bz2': { mimeType: 'application/x-bzip2', encoding: 'base64' },
		'.cda': { mimeType: 'application/x-cdf', encoding: 'binary' },
		'.csh': { mimeType: 'application/x-csh', encoding: 'binary' },
		'.css': { mimeType: 'text/css', encoding: 'utf-8' },
		'.csv': { mimeType: 'text/csv', encoding: 'utf-8' },
		'.doc': { mimeType: 'application/msword', encoding: 'binary' },
		'.docx': {
			mimeType:
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			encoding: 'binary',
		},
		'.eot': {
			mimeType: 'application/vnd.ms-fontobject',
			encoding: 'binary',
		},
		'.epub': { mimeType: 'application/epub+zip', encoding: 'binary' },
		'.gz': { mimeType: 'application/gzip', encoding: 'base64' },
		'.gif': { mimeType: 'image/gif', encoding: 'base64' },
		'.htm': { mimeType: 'text/html', encoding: 'utf-8' },
		'.html': { mimeType: 'text/html', encoding: 'utf-8' },
		'.ico': { mimeType: 'image/vnd.microsoft.icon', encoding: 'base64' },
		'.ics': { mimeType: 'text/calendar', encoding: 'utf-8' },
		'.jar': { mimeType: 'application/java-archive', encoding: 'base64' },
		'.jpeg': { mimeType: 'image/jpeg', encoding: 'base64' },
		'.jpg': { mimeType: 'image/jpeg', encoding: 'base64' },
		'.js': { mimeType: 'text/javascript', encoding: 'utf-8' },
		'.json': { mimeType: 'application/json', encoding: 'utf-8' },
		'.jsonld': { mimeType: 'application/ld+json', encoding: 'utf-8' },
		'.md': { mimeType: 'text/markdown', encoding: 'utf-8' },
		'.mid': { mimeType: 'audio/x-midi', encoding: 'binary' },
		'.midi': { mimeType: 'audio/x-midi', encoding: 'binary' },
		'.mjs': { mimeType: 'text/javascript', encoding: 'utf-8' },
		'.mp3': { mimeType: 'audio/mpeg', encoding: 'base64' },
		'.mp4': { mimeType: 'video/mp4', encoding: 'base64' },
		'.mpeg': { mimeType: 'video/mpeg', encoding: 'base64' },
		'.mpkg': {
			mimeType: 'application/vnd.apple.installer+xml',
			encoding: 'base64',
		},
		'.odp': {
			mimeType: 'application/vnd.oasis.opendocument.presentation',
			encoding: 'base64',
		},
		'.ods': {
			mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
			encoding: 'base64',
		},
		'.odt': {
			mimeType: 'application/vnd.oasis.opendocument.text',
			encoding: 'base64',
		},
		'.oga': { mimeType: 'audio/ogg', encoding: 'base64' },
		'.ogv': { mimeType: 'video/ogg', encoding: 'base64' },
		'.ogx': { mimeType: 'application/ogg', encoding: 'base64' },
		'.opus': { mimeType: 'audio/opus', encoding: 'base64' },
		'.otf': { mimeType: 'font/otf', encoding: 'base64' },
		'.png': { mimeType: 'image/png', encoding: 'base64' },
		'.pdf': { mimeType: 'application/pdf', encoding: 'base64' },
		'.php': { mimeType: 'application/x-httpd-php', encoding: 'base64' },
		'.ppt': {
			mimeType: 'application/vnd.ms-powerpoint',
			encoding: 'base64',
		},
		'.pptx': {
			mimeType:
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			encoding: 'base64',
		},
		'.rar': { mimeType: 'application/vnd.rar', encoding: 'base64' },
		'.rtf': { mimeType: 'application/rtf', encoding: 'base64' },
		'.sh': { mimeType: 'application/x-sh', encoding: 'base64' },
		'.svg': { mimeType: 'image/svg+xml', encoding: 'utf-8' },
		'.tar': { mimeType: 'application/x-tar', encoding: 'base64' },
		'.tif': { mimeType: 'image/tiff', encoding: 'base64' },
		'.tiff': { mimeType: 'image/tiff', encoding: 'base64' },
		'.ts': { mimeType: 'video/mp2t', encoding: 'base64' },
		'.ttf': { mimeType: 'font/ttf', encoding: 'base64' },
		'.txt': { mimeType: 'text/plain', encoding: 'utf-8' },
		'.vsd': { mimeType: 'application/vnd.visio', encoding: 'base64' },
		'.wav': { mimeType: 'audio/wav', encoding: 'base64' },
		'.weba': { mimeType: 'audio/webm', encoding: 'base64' },
		'.webm': { mimeType: 'video/webm', encoding: 'base64' },
		'.webp': { mimeType: 'image/webp', encoding: 'base64' },
		'.woff': { mimeType: 'font/woff', encoding: 'base64' },
		'.woff2': { mimeType: 'font/woff2', encoding: 'base64' },
		'.xhtml': { mimeType: 'application/xhtml+xml', encoding: 'utf-8' },
		'.xls': { mimeType: 'application/vnd.ms-excel', encoding: 'base64' },
	};

	private server: Server | null = null;
	private logger: Logger;
	public get baseUrl(): string {
		return `http://localhost${this.port === 80 ? '' : `:${this.port}`}/`;
	}

	constructor(
		public readonly filesRoot: string,
		public readonly port: number,
		maxLogLevel: LogLevel = LogLevel.Debug,
	) {
		this.logger = new ConsoleLogger(maxLogLevel);
	}

	serve(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.server !== null) {
				throw new Error('Cannot restart running server');
			}

			try {
				this.server = createServer((req, res) => {
					const relativePath = new URL(req.url ?? '', this.baseUrl)
						.pathname;
					this.logger.info(`UsefuleServer GET ${relativePath}`);
					this.handleRequest(req, res).catch(error =>
						this.logger.error(`UsefuleServer ${error}`),
					);
					req.once('close', () =>
						this.logger.info(
							`UsefuleServer GET ${relativePath} req closed`,
						),
					);
					res.once('close', () =>
						this.logger.info(
							`UsefuleServer GET ${relativePath} res closed`,
						),
					);
				});
				this.server.on('error', error =>
					this.logger.error(`UsefuleServer ${error}`),
				);
				this.server.listen(this.port, () => {
					console.log(
						`Serving files from ${this.filesRoot} at ${this.baseUrl}`,
					);
					resolve();
				});
			} catch (reason) {
				const error = anyToError(reason);
				reject(error);
			}
		});
	}

	stop(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.server === null) {
				resolve();
				return;
			}

			this.server.closeIdleConnections();
			this.logger.debug('UsefuleServer closed idle connections');
			this.server.closeAllConnections();
			this.server.close(error => {
				this.logger.debug(
					`UsefuleServer is being closed with error: ${error}`,
				);
				if (error !== undefined) {
					reject(error);
					return;
				}

				this.server!.unref();
				this.server = null;
				resolve();
			});
		});
	}

	private async handleRequest(
		req: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
	): Promise<void> {
		const relativePath = new URL(req.url ?? '', this.baseUrl).pathname;
		const targetPath = join(this.filesRoot, relativePath);

		let stats: Stats;
		try {
			stats = await stat(targetPath);
		} catch (reason) {
			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				res.statusCode = 404;
				res.end();
			} else {
				res.statusCode = 500;
				res.end();
				this.logger.error(`UsefuleServerError: ${error}`);
			}
			return;
		}

		if (stats.isFile()) {
			await this.serveFile(req, res, targetPath);
		} else {
			const type = stats.mode & constants.S_IFMT;
			this.logger.error(
				`UsefuleServerError: Tried to access ${targetPath} of type ${type}`,
			);
			res.statusCode = 403;
		}

		if (!res.closed) {
			res.end();
		}
	}

	private async serveFile(
		_: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
		filePath: string,
	): Promise<void> {
		const extension = extname(filePath);
		if (Object.hasOwn(UsefuleServer.mime, extension)) {
			res.setHeader(
				'Content-Type',
				UsefuleServer.mime[extension].mimeType,
			);
			res.statusCode = 200;
		} else {
			res.statusCode = 415;
			res.end();
			return;
		}

		let fd: FileHandle | undefined = undefined;
		try {
			fd = await open(filePath);

			for await (const chunk of fd.createReadStream()) {
				res.write(chunk);
			}
		} catch (reason) {
			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				res.statusCode = 404;
			} else {
				res.statusCode = 500;
			}
		} finally {
			res.end();

			if (fd !== undefined) {
				await fd.close();
			}
		}
	}
}
