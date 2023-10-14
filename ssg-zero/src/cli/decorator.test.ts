import assert from 'node:assert/strict';
import test from 'node:test';
import { createTypedFlag } from './decorator.js';

test('sets the correct name for the decorator factory', function () {
	const decoratorFactory = createTypedFlag('icedTea', null);

	assert.equal(decoratorFactory.name, 'icedTea');
});

test('sets the correct name for the decorator', function () {
	const decorator = createTypedFlag('icedTea', null)({});

	assert.equal(decorator.name, 'icedTeaFlagDecorator');
});

test('sets the correct name for the field initializer', function () {
	const contextMock: ClassFieldDecoratorContext<any, any> & { name: string } = {
		name: 'field',
		addInitializer() {
			return;
		},
	} as any;

	const fieldInitializer = createTypedFlag('icedTea', null)({})(undefined, contextMock);

	assert.equal(fieldInitializer!.name, 'onIcedTeaFieldInit');
});

test('sets the correct name for the initializer', function (t) {
	const contextMock: ClassFieldDecoratorContext<any, any> & { name: string } = {
		name: 'field',
		addInitializer() {
			return;
		},
	} as any;

  const addInitializerMock = t.mock.method(contextMock, 'addInitializer')
	createTypedFlag('icedTea', null)({})(undefined, contextMock);

  const initializer = addInitializerMock.mock.calls[0].arguments[0]

	assert.equal(initializer.name, 'onBeforeIcedTeaFieldInit');
});
