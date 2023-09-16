// import { command, run, string, number, positional, option } from 'cmd-ts';
import EventEmitter from 'events';

type BooleanOption = {
	type: 'boolean';
	description?: string;
	short?: string;
};

type OptionDefinition = BooleanOption;

type CliDefinition = {
	name: string;
	description: string;
	version: string;
	args: Record<string, OptionDefinition>;
};

export class Cli
	extends EventEmitter
{
	private name: string;
	private description: string;
	private version: string;
	private args: Record<string, OptionDefinition>;

	constructor(definition: CliDefinition) {
		super();

		this.name = definition.name;
		this.description = definition.description;
		this.version = definition.version;
		this.args = definition.args;
	}

	on(eventName: 'help', listener: () => void): this {
		return super.on(eventName, listener);
	}

  parse(): void {
    this.emit('help')
  }
}

// const cmd = command({
// 	name: 'my-command',
// 	description: 'print something to the screen',
// 	version: '1.0.0',
// 	args: {
// 		number: positional({ type: number, displayName: 'num' }),
// 		message: option({
// 			long: 'greeting',
// 			type: string,
// 		}),
// 	},
// });
//
// // run(cmd, process.argv.slice(2));
