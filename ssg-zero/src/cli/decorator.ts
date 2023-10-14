import { toKebabCase, toPascalCase } from '../util/string.js';
import { numberType, type Command, type FlagSchema } from './flag.js';

type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

type Clearify<T> = { [K in keyof T]: T[K] } & {};

type FlagConfig = Clearify<Omit<FlagSchema, 'valueType'>>;

export function typedFlag<This extends Command, BaseValue>(
	flagType: FlagSchema['valueType'],
	config: FlagConfig,
): <Value extends BaseValue>(
	value: undefined,
	context: ClassNamedFieldDecoratorContext<This, Value>,
) => ((this: This, value: Value) => Value) | void {
	const typeName = flagType === null ? 'boolean' : flagType.name;

	function decorator<Value extends BaseValue>(
		_: undefined,
		context: ClassNamedFieldDecoratorContext<This, Value>,
	) {
		const flagName = toKebabCase(context.name);
		function onBeforeInit(this: This): void {
			this['schema'][flagName] = Object.assign<
				FlagConfig,
				Pick<FlagSchema, 'valueType'>
			>(config, { valueType: flagType });
		}

		setFunctionName(
			onBeforeInit,
			`onBeforeInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`,
		);

		context.addInitializer(onBeforeInit);

		function onInit(this: This, value: Value) {
			if (value !== undefined) {
				this['schema'][flagName].default = value;
			}
			return value;
		}

		setFunctionName(onInit, `onInit${toPascalCase(context.name)}As${toPascalCase(typeName)}`);

		return onInit;
	}

	setFunctionName(decorator, `${typeName}FlagDecorator`);

	return decorator;
}

export const boolean = (typedFlag<Command, boolean | undefined>).bind(
	null,
	null,
);
export const number = (typedFlag<Command, number | undefined>).bind(
	null,
	numberType,
);
export const string = (typedFlag<Command, string | undefined>).bind(
	null,
	String,
);

function setFunctionName(fn: Function, name: string): void {
	Object.defineProperty(fn, 'name', {
		enumerable: false,
		writable: false,
		configurable: true,
		value: name,
	});
}
