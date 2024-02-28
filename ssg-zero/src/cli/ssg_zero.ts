import { boolean, cli, string, subcommand } from '../parse_args.js';
import { Build } from './build_command.js';
import { Serve } from './serve_command.js';

const NPM_VERSION = '0.5.0';

@cli({ desc: 'Static site generator CLI' })
export class SsgZero {
	static readonly version: string = NPM_VERSION;

	@boolean({ short: 'h' })
	help?: boolean;

	@boolean({})
	version?: boolean;

	@string({ short: 'c' })
	config: string = 'zero.config.js';

	@subcommand([Build, Serve])
	command?: Build | Serve;
}
