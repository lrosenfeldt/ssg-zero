import { AsyncLocalStorage } from 'node:async_hooks';
import EventEmitter from 'node:events';
import { createReadStream, stat } from 'node:fs';
import {
	type IncomingMessage,
	type ServerResponse,
	Server,
	createServer,
} from 'node:http';
import { extname, join } from 'node:path';

import { anyToError } from './core.js';
import { mime } from './mime.js';
import { toHttpDate } from './http_date.js';
import { Injector } from './injector.js';

export type UsefuleServerContext = {
	id: number;
	status: number;
	accept: string[];
	filePath?: string;
	bytes?: number;
};

export type ServerOptions = {
	port?: number;
	injectScript?: string;
};

type ServerEventMap = {
	error: [NodeJS.ErrnoException & { meta?: UsefuleServerContext }];
	'file:done': [UsefuleServerContext];
};

export class UsefuleServer extends EventEmitter<ServerEventMap> {
	private store: AsyncLocalStorage<UsefuleServerContext> =
		new AsyncLocalStorage();
	private nextId: number = 0;
	private server: Server | null = null;
	private injectScript: string | undefined;

	readonly filesRoot: string;
	readonly port: number;
	get baseUrl(): string {
		return `http://localhost${this.port === 80 ? '' : `:${this.port}`}/`;
	}

	constructor(filesRoot: string, options: ServerOptions = {}) {
		super();

		this.filesRoot = filesRoot;
		this.port = options.port ?? 6942;
		this.injectScript = options.injectScript;
	}

	serve(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.server !== null) {
				resolve();
				return;
			}

			this.once('error', reason => {
				const error = anyToError(reason);
				reject(error);
			});

			this.server = createServer((req, res) =>
				this.handleRequest(req, res),
			);

			this.server.listen(this.port, resolve);
		});
	}

	stop(): Promise<void> {
		return new Promise<void>((resolve, _reject) => {
			const server = this.server;
			if (server === null) {
				resolve();
				return;
			}

			server.closeIdleConnections();
			server.closeAllConnections();
			server.close(error => {
				if (error !== undefined) {
					// error is only provided if server already stopped
					resolve();
					return;
				}
				server.unref();
				this.server = null;
				resolve();
			});
		});
	}

	private handleRequest(
		req: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
	): void {
		const accept = req.headers.accept?.split(',') ?? ['*/*'];
		const context: UsefuleServerContext = {
			id: this.nextId++,
			status: NaN,
			accept,
			filePath: undefined,
		};
		res.once('close', () => {
			context.status = res.statusCode;
			this.emit('file:done', context);
		});

		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.statusCode = 405;
			res.setHeader('Allow', 'GET, HEAD');
			res.end();
			return;
		}

		const { pathname } = new URL(req.url ?? '', this.baseUrl);
		let extension = extname(pathname);
		if (extension === '' && !pathname.endsWith('/')) {
			res.statusCode = 301;
			res.setHeader('Location', pathname + '/');
			res.end();
			return;
		}

		if (pathname.endsWith('/')) {
			context.filePath = join(this.filesRoot, pathname, 'index.html');
			extension = '.html';
		} else {
			context.filePath = join(this.filesRoot, pathname);
		}

		const mimeType: string | undefined = mime[extension]?.mimeType;
		if (mimeType === undefined) {
			res.statusCode = 415;
			res.end();
			return;
		}

		if (accept.includes('*/*')) {
			res.setHeader('Content-Type', mimeType);
		} else if (accept.includes(mimeType)) {
			res.setHeader('Content-Type', mimeType);
		} else {
			res.setHeader('Accept', mimeType);
			res.statusCode = 406;
			res.end();
			return;
		}

		this.store.run(context, () => this.preServeFile(req, res));
	}

	private preServeFile(
		req: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
	): void {
		const context = this.store.getStore()!;
		stat(context.filePath!, (reason, stats) => {
			if (reason !== null) {
				const error = anyToError(reason);
				if (error.code === 'ENOENT') {
					res.statusCode = 404;
					res.end();
					return;
				}

				res.statusCode = 500;
				res.end();

				const errorWithMeta = Object.assign(error, { meta: context });
				this.emit('error', errorWithMeta);
				return;
			}

			const date = new Date(stats.mtime);
			res.setHeader('Last-Modified', toHttpDate(date));

			if (req.headers['if-modified-since']) {
				// TODO: this is probably super unsafe, but the alternative is Date parsing and handling all the crazy js date api stuff
				const clientDate = new Date(req.headers['if-modified-since']);
				if (clientDate.toString() === 'Invalid Date') {
					res.statusCode = 400;
					res.end();
					return;
				}

				if (date < clientDate) {
					res.statusCode = 304;
					res.end();
					return;
				}
			}

			if (req.method === 'GET') {
				this.serveFile(req, res);
			}
		});
	}
	private serveFile(
		_req: IncomingMessage,
		res: ServerResponse<IncomingMessage> & { req: IncomingMessage },
	): void {
		const context = this.store.getStore()!;
		const fileStream = createReadStream(context.filePath!, {
			flags: 'r',
		});

		let injector: Injector | undefined;
		if (this.injectScript) {
			injector = new Injector('</body>', this.injectScript);
			injector.on('error', reason => {
				const error = anyToError(reason);
				this.emit('error', error);
				res.destroy(error);
			});
		}

		fileStream.once('error', reason => {
			fileStream.close();

			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				res.statusCode = 404;
				res.end();
				return;
			}

			res.statusCode = 500;
			res.end();

			const errorWithMeta = Object.assign(error, { meta: context });
			this.emit('error', errorWithMeta);
		});

		fileStream.once('end', () => {
			context.bytes = fileStream.bytesRead;
		});

		if (injector) {
			fileStream.pipe(injector).pipe(res);
		} else {
			fileStream.pipe(res);
		}
	}
}
