import { FileHandle, open, readdir, stat } from 'node:fs/promises';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Server, createServer } from 'node:http';
import { extname, join } from 'node:path';

export function anyToError(reason: unknown): NodeJS.ErrnoException {
	let errorMessage: string;
	switch (typeof reason) {
		case 'object':
			if (reason instanceof Error) {
				return reason;
			} else if (reason === null) {
				errorMessage = `Failed with value null.`;
				break;
			}
			errorMessage = `Failed with object of type ${reason.constructor.name}.`;
			break;
		case 'undefined':
			errorMessage = `Failed with value of undefined.`;
			break;
		case 'string':
		case 'bigint':
		case 'boolean':
		case 'number':
		case 'symbol':
			errorMessage = `Failed with value ${reason.toString()} of type ${typeof reason}.`;
			break;
		case 'function':
			errorMessage = `Failed with function ${reason.name}.`;
			break;
		default:
			errorMessage = `Failed with ${reason} of unhandled {typeof reason}. This is an implementation error '${__filename}'.`;
			break;
	}
	return new Error(errorMessage, { cause: reason });
}

export async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (reason) {
		const error = anyToError(reason);
		if (error.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
}

export type UsefulePath = { dir: string; base: string };
export async function* walkFiles(root: string): AsyncGenerator<UsefulePath> {
	const dirs = [root];
	for (const dir of dirs) {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				dirs.push(join(dir, entry.name));
				continue;
			}
			if (entry.isFile()) {
				yield { dir, base: entry.name };
			}
		}
	}
}

type MimeTypeInfo = {
	mimeType: string;
	encoding: BufferEncoding;
};

export class UsefuleServer {
	public static readonly mime: Record<string, MimeTypeInfo> = {
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
	public get baseUrl(): string {
		return `http://localhost${this.port === 80 ? '' : `:${this.port}`}/`;
	}

	constructor(
		public readonly filesRoot: string,
		public readonly port: number,
	) {}

	serve(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.server !== null) {
				throw new Error('Cannot restart running server');
			}

			try {
				this.server = createServer((req, res) =>
					this.serveFile(req, res),
				);
				this.server.on('error', error =>
					console.log('UsefuleServerError:', error),
				);
				this.server.listen(this.port, () => {
					console.log(
						`Serving files from ${this.filesRoot} at ${this.baseUrl}.`,
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

			this.server.close(error => {
				if (error !== undefined) {
					reject(error);
					return;
				}

				this.server = null;
				resolve();
			});
		});
	}

	private async serveFile(
		req: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
	): Promise<void> {
		const filePath: string = new URL(req.url ?? '', this.baseUrl).pathname;

		const extension = extname(filePath);
		let mimeType: string;
		if (Object.hasOwn(UsefuleServer.mime, extension)) {
			mimeType = UsefuleServer.mime[extension].mimeType;
		} else if (extension === '') {
			mimeType = 'text/plain';
		} else {
			res.statusCode = 415;
			res.end();
      return
		}

    res.setHeader('Content-Type', mimeType)

		let fd: FileHandle | null = null;
		try {
      console.log(join(this.filesRoot, filePath))
			fd = await open(join(this.filesRoot, filePath));

			res.statusCode = 200;
			for await (const chunk of fd.createReadStream()) {
				res.write(chunk);
			}
		} catch (reason) {
			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				res.statusCode = 404;
			} else {
				res.statusCode = 500;
				console.log('UsefuleServerError', error);
			}
		} finally {
			if (fd !== null) {
				await fd.close();
			}
			res.end();
		}
	}
}
