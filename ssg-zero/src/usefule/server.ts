import { constants, createReadStream } from 'node:fs';
import { type IncomingMessage, type ServerResponse, Server } from 'node:http';
import { extname, join } from 'node:path';

import { anyToError } from './core.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mime } from './mime.js';

export type ServerEvent = {
	id: number;
	route: string;
	status: number;
	filePath?: string;
	bytes?: number;
};

export class UsefuleServer extends Server {
	private context: AsyncLocalStorage<ServerEvent> = new AsyncLocalStorage();
	private nextId: number = 0;
	private running: boolean = false;

	public get baseUrl(): string {
		return `http://localhost${this.port === 80 ? '' : `:${this.port}`}/`;
	}

	constructor(
		public readonly filesRoot: string,
		public readonly port: number,
	) {
		super();
	}

	serve(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.running) {
				resolve();
			}

			this.once('error', reason => {
				const error = anyToError(reason);
				reject(error);
			});

			this.addListener('request', (req, res) => {
				const requestPath = new URL(req.url ?? '', this.baseUrl)
					.pathname;
				const store: ServerEvent = {
					id: this.nextId++,
					route: requestPath,
					status: NaN,
				};
				this.context.run(store, () => {
					this.handleRequest(req, res);
				});
			});

			this.listen(this.port, () => {
				this.running = true;
				resolve();
			});
		});
	}

	stop(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!this.running) {
				resolve();
				return;
			}

			this.closeIdleConnections();
			this.closeAllConnections();
			this.close(error => {
				if (error !== undefined) {
					reject(error);
					return;
				}

				this.running = false;
				this.unref();
				resolve();
			});
		});
	}

	private handleRequest(
		_req: IncomingMessage,
		res: ServerResponse & { req: IncomingMessage },
	): void {
		const store = this.context.getStore()!;
		console.log('store', store);
		res.on('finish', () => {
			store.status = res.statusCode;

			this.emit('file:done', store);
		});

		const targetPath = join(this.filesRoot, store.route);
		store.filePath = targetPath;

		const extension = extname(targetPath);
		if (Object.hasOwn(mime, extension)) {
			res.setHeader(
				'Content-Type',
				mime[extension].mimeType,
			);
			res.statusCode = 200;
		} else {
			res.statusCode = 415;
			res.end();
			return;
		}

		const r = createReadStream(targetPath, {
			flags: 'r',
			mode: constants.O_RDONLY,
		});

		r.on('error', reason => {
			r.close();

			const error = anyToError(reason);

			if (error.code === 'ENOENT') {
				if (!res.closed) {
					res.statusCode = 404;
					res.end();
				}
				return;
			}

			if (!res.closed) {
				res.statusCode = 500;
				res.end();
			}

			const store = this.context.getStore()!;
			const errorWithMeta = Object.assign<
				NodeJS.ErrnoException,
				{ meta: { event: ServerEvent } }
			>(error, { meta: { event: store } });
			this.emit('error', errorWithMeta);
		});
		// res may end ungracefully, also check file stream
		r.once('end', () => {
			store.bytes = r.bytesRead;
		});

		r.pipe(res);
	}
}
