import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { Command, typedFlag, boolean, number, string } from './flag.js';

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
		const decorator = typedFlag(icedTea, { type: 'abc' });
		assert.equal(decorator.name, 'icedTeaFlagDecorator');
	});
	test('sets the name for the field initializer based on the type and field name', function () {
		const fieldInitializer = typedFlag(icedTea, { type: 'abc' })(
			undefined,
			contextMock,
		);

		assert.equal(fieldInitializer!.name, 'onInitColdDrinkAsIcedTea');
	});
	test('sets the name for the initializer based on the type and field name', function (t) {
		const addInitializerMock = t.mock.method(contextMock, 'addInitializer');
		typedFlag(icedTea, { type: 'abc' })(undefined, contextMock);
		const initializer = addInitializerMock.mock.calls[0].arguments[0];

		assert.equal(initializer.name, 'onBeforeInitColdDrinkAsIcedTea');
	});
});

suite('decorators', function () {
	test('reports the usage based on the internal schema', function () {
		class Dev extends Command {
			@boolean({
				description: 'Show version information',
        type: 'boolean',
			})
			version?: boolean;

			@boolean({
				short: 'd',
				description: 'Only print out what will been generated',
        type: 'boolean',
			})
			dryRun?: boolean;

			@number({
				short: 'p',
				description: 'Port to serve build output on',
        type: 'number',
			})
			port: number = 4269;

			@string({ description: 'Caching strategy to use on files', type: 'string' })
			cachingMethod: string = 'advanced-btree5';

			@string({ description: 'Relative path to schema file', type: 'string'  })
			schema?: string;
		}
		const dev = new Dev('Develop a static site');

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

		assert.equal(dev.usage('ssg-zero'), expectedUsage);
	});

	test('converts the class name to kebab-case in usage', function () {
		class DoIt extends Command {}
		const doIt = new DoIt('DOOO IT!');

		const expectedUsage = `\
Usage: app do-it [OPTIONS]
DOOO IT!

Options:

`;

		assert.equal(doIt.usage('app'), expectedUsage);
	});
});
