import { command, number } from '../parse_args.js';

@command({ desc: 'Watch & rebuild your static site' })
export class Dev {
	@number({ short: 'p' })
	port: number = 6942;
}
