import { UsefuleServer, ServerEvent } from '../usefule/server.js';
import { command, number } from '../parse_args.js';
import { type Logger } from '../logger.js';

@command({ desc: 'Build your static site ' })
export class Build {}
