import { type LogLevels, type Handler, type Bindings } from './base.js';

export function stringify(obj: object, maxDepth: number = 5): string {
	try {
		return JSON.stringify(obj);
	} catch {
		return stringifySafe(obj, maxDepth);
	}
}

function stringifySafe(obj: object, limit: number): string {
	if (limit <= 0) {
		return '"[deep object]"';
	}

	let json = '';

	for (const key in obj) {
		const value = (obj as any)[key];

		let strValue: string;
		switch (typeof value) {
			case 'bigint':
			case 'function':
			case 'symbol':
			case 'undefined':
				continue;
			case 'number':
				if (!Number.isFinite(value)) {
					strValue = 'null';
					break;
				}
			// fallthrough
			case 'boolean':
				strValue = value.toString();
				break;
			case 'string':
				// escape string
				strValue = JSON.stringify(value);
				break;
			case 'object':
				if (value === null) {
					strValue = 'null';
					break;
				}
				strValue = stringifySafe(value, limit - 1);
				break;
		}
		json += ',' + '"' + key + '":' + strValue;
	}
	json = '{' + json.slice(1) + '}';
	return json;
}

export class TextHandler implements Handler {
	private childBindings: string = '';
	private levelMap: Record<number, string> = {};

	constructor(levels: LogLevels) {
		for (const label in levels) {
			this.levelMap[levels[label]] = label.toLocaleUpperCase();
		}
	}

	child(levels: LogLevels, bindings?: Bindings): TextHandler {
		const child = new TextHandler(levels);

		if (bindings) {
			child.childBindings = this.childBindings + this.asText(bindings);
		}
		return child;
	}

	handle(
		level: number,
		message: string | undefined,
		attrs: object | undefined,
		time: string,
	): string {
		let text = time + ' ' + this.levelMap[level];
		if (message) {
			text += ' ' + message;
		}
		text += this.childBindings;
		if (attrs) {
			text += this.asText(attrs);
		}
		return text;
	}

	private asText(obj: object): string {
		let text = '';

		for (const key in obj) {
			if (!Object.hasOwn(obj, key)) {
				continue;
			}

			const value = (obj as any)[key];

			let strValue: string;
			switch (typeof value) {
				case 'bigint':
				case 'function':
				case 'symbol':
				case 'undefined':
					continue;
				case 'boolean':
				case 'number':
					strValue = value.toString();
					break;
				case 'string':
					strValue = this.quoteIfWhitespace(value);
					break;
				case 'object':
					if (value === null) {
						strValue = 'null';
						break;
					}
					strValue = stringify(value);
			}

			text += ' ' + key + '=' + strValue;
		}
		return text;
	}

	private quoteIfWhitespace(str: string): string {
		if (
			str.includes(' ') ||
			str.includes('\n') ||
			str.includes('\r\n') ||
			str.includes('\t')
		) {
			return '"' + str + '"';
		}
		return str;
	}
}

export class JsonHandler implements Handler {
	private childBindings: string = '';
	private prefixCache: Record<number, string> = {};

	constructor(levels: LogLevels) {
		for (const label in levels) {
			const level = levels[label];
			this.prefixCache[level] = `{"level":${level},"time":`;
		}
	}

	child(levels: LogLevels, bindings?: Bindings | undefined): Handler {
		const child = new JsonHandler(levels);

		if (bindings) {
			child.childBindings =
				this.childBindings + this.asJson(bindings).slice(1, -1);
		}
		return child;
	}

	handle(
		level: number,
		message: string | undefined,
		attrs: object | undefined,
		time: string,
	): string {
		let data = this.prefixCache[level] + time;
		if (this.childBindings) {
			data += ',' + this.childBindings;
		}
		if (message) {
			data += ',"msg":' + JSON.stringify(message);
		}
		if (attrs) {
			data += ',' + this.asJson(attrs).slice(1, -1);
		}
		data += '}';
		return data;
	}

	private asJson(obj: object): string {
		let json = '';
		for (const key in obj) {
			if (!Object.hasOwn(obj, key)) {
				continue;
			}

			const value = (obj as any)[key];

			let strValue: string;
			switch (typeof value) {
				case 'bigint':
				case 'function':
				case 'symbol':
				case 'undefined':
					continue;
				case 'number':
					if (!Number.isFinite(value)) {
						strValue = 'null';
						break;
					}
				// fallthrough
				case 'boolean':
					strValue = value.toString();
					break;
				case 'string':
					// escape string
					strValue = JSON.stringify(value);
					break;
				case 'object':
					if (value === null) {
						strValue = 'null';
						break;
					}
					strValue = stringify(value);
			}
			json += ',"' + key + '":' + strValue;
		}
		json = '{' + json.slice(1) + '}';
		return json;
	}
}
