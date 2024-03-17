import { fileURLToPath, pathToFileURL } from 'node:url';

import { cli } from './parse.js';
import { SSG, SSGBuilder } from '../ssg.js';
import { logger } from '../logger.js';
import { anyToError } from '../usefule/core.js';
import { watch } from '../usefule/watcher.js';
import { UsefuleServer } from '../usefule/server.js';
import { readFileSync } from 'node:fs';

const VERSION = '0.5.0';

async function loadSsg(configPath: string): Promise<SSG> {
	const configModule = await import(pathToFileURL(configPath).toString());
	if (configModule.default === undefined) {
		throw new Error(
			`Config file ${configPath} is missing a default export`,
		);
	}
	let ssg: SSG;
	if (configModule.default instanceof SSGBuilder) {
		ssg = configModule.build();
	} else if (configModule.default instanceof SSG) {
		ssg = configModule.default;
	} else {
		throw new Error(
			`Config file ${configPath} is unusable. Add a SSG or SSGBuilder as default export`,
		);
	}

	return ssg;
}

export async function run(): Promise<void> {
	const options = cli(process.argv.slice(2));

	if (options.values.help) {
		console.log('Usage: ssg-zero [OPTIONS]');
		process.exit(0);
	}

	if (options.values.version) {
		console.log(VERSION);
		process.exit(0);
	}

	const ssg = await loadSsg(options.values.config);

	if (options.command === 'build') {
		await ssg.build();
	} else if (options.command === 'serve') {
		const serverLogger = logger.child({ src: 'UsefuleServer' });
		const server = new UsefuleServer(ssg.outputDir, {
			port: options.values.port,
		});
		server.on('error', error => serverLogger.error(error));
		server.on('file:done', payload => serverLogger.info(payload));

		await server.serve();
		serverLogger.info(
			`Serving files from ${server.filesRoot} on: ${server.baseUrl}`,
		);

		process.once('SIGINT', () => {
			server
				.stop()
				.catch((reason: any) =>
					logger.error('failed to stop server', anyToError(reason)),
				);
			process.exit(1);
		});
	} else if (options.command === 'dev') {
		const serverLogger = logger.child({ src: 'UsefuleServer' });
		const hotreloadUrl = import.meta.resolve('../usefule/hotreload.js');
		const server = new UsefuleServer(ssg.outputDir, {
			port: options.values.port,
			injectScript: `<script type="module">${readFileSync(fileURLToPath(hotreloadUrl), 'utf-8')}</script>`,
		});
		server.on('error', error => serverLogger.error(error));
		server.on('file:done', payload => serverLogger.info(payload));

		await server.serve();
		serverLogger.info(
			`Serving files from ${server.filesRoot} on: ${server.baseUrl}`,
		);

		process.once('SIGINT', () => {
			server
				.stop()
				.catch((reason: any) =>
					logger.error('failed to stop server', anyToError(reason)),
				);
			process.exit(1);
		});

		const reader = watch(ssg.inputDir, {
			maxInterval: 100,
			disableDelete: true,
		});
		await ssg.build(reader);
	}
}
