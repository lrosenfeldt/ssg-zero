import { pathToFileURL } from 'node:url';

import {
	boolean,
	cli,
	command,
	number,
	parse,
	string,
	subcommand,
} from './parse_args.js';
import { UsefuleServer } from './usefule/server.js';
import { SSG, SSGBuilder } from './ssg.js';
import { type DefaultLogLevels } from './slog/index.js';
import { type Slog } from './slog/interface.js';
import { TextTransform } from './slog/text_transform.js';
import { slog } from './slog/index.js';

type Logger = Slog<DefaultLogLevels>;

@command({ desc: '' })
class Serve {
	@number({ short: 'p' })
	port: number = 6942;

	async setupServer(ssg: SSG, logger: Logger): Promise<UsefuleServer> {
		const serverLogger = logger.child({ src: 'UsefuleServer' });
		const server = new UsefuleServer(ssg.outputDir, this.port);

		server.on('error', error => serverLogger.error(error));

		const traceListener = (payload: any) => serverLogger.trace(payload);
		server.on('file:done', traceListener);
		server.on('file:sent', traceListener);
		server.on('file:unsupported_type', traceListener);
		server.once('listening', () =>
			serverLogger.info(
				`Serving files from ${server.filesRoot} on:\n${server.baseUrl}`,
			),
		);

		await server.serve();
		return server;
	}
}

@command({ desc: '' })
class Build {}

@command({
	desc: 'Watches input dir and continously rebuilds the output. Site is served on localhost.',
})
class Dev {
	@number({ short: 'p' })
	port: number = 6942;

	async run(ssg: SSG, logger: Logger) {}
}

@cli({ desc: '' })
class SsgZero {
	static readonly version: string =
		process.env.npm_package_version ?? 'nightly';

	@boolean({ short: 'h' })
	help?: boolean;

	@boolean({})
	version?: boolean;

	@string({ short: 'c' })
	config: string = 'zero.config.js';

	@subcommand([Build, Serve, Dev])
	command?: Build | Serve | Dev;

	async loadSsg(): Promise<SSG> {
		const configModule = await import(
			pathToFileURL(this.config).toString()
		);
		if (configModule.default === undefined) {
			throw new Error(
				`Config file ${this.config} is missing a default export`,
			);
		}
		let ssg: SSG;
		if (configModule.default instanceof SSGBuilder) {
			ssg = configModule.build();
		} else if (configModule.default instanceof SSG) {
			ssg = configModule.default;
		} else {
			throw new Error(
				`Config file ${this.config} is unusable. Add a SSG or SSGBuilder as default export`,
			);
		}

		return ssg;
	}
}

const ssgZero = parse(SsgZero, process.argv.slice(2));

if (ssgZero.help) {
	console.log('Usage: ssg-zero [OPTIONS]');
	process.exit(0);
}

if (ssgZero.version) {
	console.log(SsgZero.version);
	process.exit(0);
}

const ssg = await ssgZero.loadSsg();

if (ssgZero.command instanceof Serve) {
  const destination = process.stdout.pipe(new TextTransform());
	const logger = slog(undefined, destination);
	const server = await ssgZero.command.setupServer(ssg, logger);

	process.once('SIGINT', () => {
		server
			.stop()
			.catch(error => logger.error('failed to stop server', error));
		process.exit(1);
	});
} else if (ssgZero.command instanceof Build) {
	await ssg.setup();
	await ssg.build();
	process.exit(0);
} else if (ssgZero.command instanceof Dev) {
	console.log('Hello from dev mode');
} else {
	console.log('Usage: ssg-zero [OPTIONS]');
	process.exit(0);
}
