import { numberType, type Command, type FlagSchema } from './flag.js';

type ClassNamedFieldDecoratorContext<This, Value> = ClassFieldDecoratorContext<
	This,
	Value
> & { name: string };

type ClassNamedFieldDecorator<This, Value> = (
	value: undefined,
	context: ClassNamedFieldDecoratorContext<This, Value>,
) => ((this: This, value: Value) => Value) | void;

type Clearify<T> = { [K in keyof T]: T[K] } & {};

type FlagConfig = Clearify<Omit<FlagSchema, 'valueType'>>;

export function createTypedFlag<This extends Command, BaseValue>(typeName: string, flagType: FlagSchema['valueType']): <Value extends BaseValue,>(config: FlagConfig) => ClassNamedFieldDecorator<This, Value> {
  const createDecorator = function decorate<Value extends BaseValue,>(config: FlagConfig): ClassNamedFieldDecorator<This, Value> {
    const decorator: ClassNamedFieldDecorator<This, Value> = function (_, context)  {
      const flagName = toKebabCase(context.name);
      const onBeforeInit = function (this: This): void {
        this['schema'][flagName] = Object.assign<FlagConfig, Pick<FlagSchema, 'valueType'>>(config, { valueType: flagType });
      }

      setFunctionName(onBeforeInit, `onBefore${capitalize(typeName)}FieldInit`);

      context.addInitializer(onBeforeInit);
      
      const onInit: (this: This, value: Value) => Value = function (value) {
        if (value !== undefined) {
          this['schema'][flagName].default = value;
        }
        return value;
      }

      setFunctionName(onInit, `on${capitalize(typeName)}FieldInit`);

      return onInit;
    }

    setFunctionName(decorator, `${typeName}FlagDecorator`);

    return decorator;
  }

  setFunctionName(createDecorator, typeName);
  return createDecorator;
}

export const boolean = createTypedFlag<Command, boolean | undefined>('boolean', null);
export const number = createTypedFlag<Command, number | undefined>('number', numberType);
export const string = createTypedFlag<Command, string | undefined>('string', String);


function capitalize(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str[0].toUpperCase() + str.slice(1);
}

function toKebabCase(str: string): string {
		let kebabCased = str[0].toLowerCase();
		for (const char of str.slice(1)) {
			if (char === char.toUpperCase()) {
				kebabCased += '-' + char.toLowerCase();
			} else {
				kebabCased += char;
			}
		}
		return kebabCased;
}

function setFunctionName(fn: Function, name: string): void {
  Object.defineProperty(fn, 'name', {
    enumerable: false,
    writable: false,
    configurable: true,
    value: name,
  });
}
