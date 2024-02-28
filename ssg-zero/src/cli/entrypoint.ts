import { pathToFileURL } from 'node:url';

import { parse } from '../parse_args.js';
import { SSG, SSGBuilder } from '../ssg.js';
import { SsgZero } from './cli.js';
import { Build } from './build_command.js';
import { Serve } from './serve_command.js';
import { logger } from '../logger.js';
import { anyToError } from '../usefule/core.js';

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
	const ssgZero = parse<SsgZero>(SsgZero, process.argv.slice(2));

	if (ssgZero.help) {
		console.log('Usage: ssg-zero [OPTIONS]');
		process.exit(0);
	}

	if (ssgZero.version) {
		console.log(SsgZero.version);
		process.exit(0);
	}

	const ssg = await loadSsg(ssgZero.config);

	if (ssgZero.command instanceof Build) {
		await ssg.build();
	} else if (ssgZero.command instanceof Serve) {
		const server = await ssgZero.command.setupServer(ssg, logger);

		process.once('SIGINT', () => {
			server
				.stop()
				.catch((reason: any) =>
					logger.error('failed to stop server', anyToError(reason)),
				);
			process.exit(1);
		});
	}
}
