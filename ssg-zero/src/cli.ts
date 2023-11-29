import { join } from 'node:path';
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

@command({ desc: '' })
class Serve {
	@number({ short: 'p' })
	port: number = 6942;
}

@command({ desc: '' })
class Build {}

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

	@subcommand([Build, Serve])
	command?: Build | Serve;

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
	const server = new UsefuleServer(ssg.outputDir, ssgZero.command.port);

	process.once('SIGINT', () =>
		server.stop().catch(error => {
			throw error;
		}),
	);
	await server.serve();
} else if (ssgZero.command instanceof Build) {
	await ssg.setup();
	await ssg.build();
	process.exit(0);
} else {
	console.log('Usage: ssg-zero [OPTIONS]');
	process.exit(0);
}
