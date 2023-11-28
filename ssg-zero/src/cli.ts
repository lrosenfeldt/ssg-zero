import { boolean, cli, parse } from './parse_args.js';

@cli({ desc: '' })
class SsgZero {
	static readonly version: string =
		process.env.npm_package_version ?? 'nightly';

	@boolean({ short: 'h' })
	help?: boolean;

	@boolean({})
	version?: boolean;
}

const config = parse(SsgZero, process.argv.slice(2));

if (config.help) {
	console.log('Usage: ssg-zero [OPTIONS]');
	process.exit(0);
}

if (config.version) {
	console.log(SsgZero.version);
	process.exit(0);
}

console.log('Usage: ssg-zero [OPTIONS]');
process.exit(0);
