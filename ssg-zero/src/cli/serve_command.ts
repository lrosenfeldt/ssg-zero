import { type Logger } from '../logger.js';
import { command, number } from '../parse_args.js';
import { type SSG } from '../ssg.js';
import { UsefuleServer, ServerEvent } from '../usefule/server.js';

@command({ desc: 'Serve files on localhost' })
export class Serve {
	@number({ short: 'p' })
	port: number = 6942;

	async setupServer(ssg: SSG, logger: Logger): Promise<UsefuleServer> {
		const serverLogger = logger.child({ src: 'UsefuleServer' });
		const server = new UsefuleServer(ssg.outputDir, this.port);

		server.on('error', error => serverLogger.error(error));
		server.on('file:done', (payload: ServerEvent) =>
			serverLogger.info(payload),
		);

		server.once('listening', () =>
			serverLogger.info(
				`Serving files from ${server.filesRoot} on: ${server.baseUrl}`,
			),
		);

		await server.serve();
		return server;
	}
}
