import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import {
  commands,
	typedFlag,
	boolean,
	number,
	string,
	description,
	commandUsage,
} from './flag.js';

suite('typedFlag', function () {
	// custom flag type
	function icedTea(value: string) {
		return value;
	}
	const contextMock: ClassFieldDecoratorContext<any, any> & {
		name: string;
	} = {
		name: 'coldDrink',
		addInitializer() {
			return;
		},
	} as any;

	test('sets the decorator name based on the flagType', function () {
		const decorator = typedFlag(icedTea, {});
		assert.equal(decorator.name, 'icedTeaFlagDecorator');
	});
	test('sets the name for the field initializer based on the type and field name', function () {
		const fieldInitializer = typedFlag(icedTea, {})(undefined, contextMock);

		assert.equal(fieldInitializer!.name, 'onInitColdDrinkAsIcedTea');
	});
});

@description('Build a static site for production')
class Build {
	@boolean({
		short: 'd',
		description: 'Only print out what will been generated',
	})
	dryRun?: boolean;

	@string({ description: 'Caching strategy to use on files' })
	cachingMethod: string = 'advanced-btree5';
}

@description('Serve build output on localhost')
class Serve {
	@number({
		short: 'p',
		description: 'Port to serve build output on',
	})
	port: number = 4269;

	@string({ description: 'Strategy to use for hot reloading' })
	hotReload?: string;
}

@description('Toolkit for developing static sites')
class Cli {
	@commands([new Serve(), new Build()])
	command?: Serve | Build;

	@boolean({ description: 'Show this message', short: 'h' })
	help?: boolean;

	@string({ description: 'Relative path to config file', short: 'c' })
	configFile: string = 'config.json';

	@number({ description: 'Number of threads to use' })
	concurrency: number = 1;
}

suite('decorators', function () {
	test('reports the usage based on the internal schema', function () {
		@description('Develop a static site')
		class Dev {
			@boolean({
				description: 'Show version information',
			})
			version?: boolean;

			@boolean({
				short: 'd',
				description: 'Only print out what will been generated',
			})
			dryRun?: boolean;

			@number({
				short: 'p',
				description: 'Port to serve build output on',
			})
			port: number = 4269;

			@string({ description: 'Caching strategy to use on files' })
			cachingMethod: string = 'advanced-btree5';

			@string({ description: 'Relative path to schema file' })
			schema?: string;
		}
		const dev = new Dev();

		const expectedUsage = `\
Usage: ssg-zero dev [OPTIONS]
Develop a static site

Options:
      --version                  Show version information
  -d, --dry-run                  Only print out what will been generated
  -p, --port <number>            Port to serve build output on (default 4269)
      --caching-method <string>  Caching strategy to use on files (default "advanced-btree5")
      --schema <string>          Relative path to schema file
`;

		assert.equal(commandUsage(dev as any), expectedUsage);
	});

	test('converts the class name to kebab-case in usage', function () {
		@description('DOOO IT!')
		class DoIt {}
		const doIt = new DoIt();

		const expectedUsage = `\
Usage: ssg-zero do-it [OPTIONS]
DOOO IT!

Options:

`;

		assert.equal(commandUsage(doIt as any), expectedUsage);
	});
});
