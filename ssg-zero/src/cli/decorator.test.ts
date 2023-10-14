import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { typedFlag } from './decorator.js';

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
	test('sets the name for the initializer based on the type and field name', function (t) {
    const addInitializerMock = t.mock.method(contextMock, 'addInitializer')
		typedFlag(icedTea, {})(undefined, contextMock);
		const initializer = addInitializerMock.mock.calls[0].arguments[0];


		assert.equal(initializer.name, 'onBeforeInitColdDrinkAsIcedTea');
	});
});
