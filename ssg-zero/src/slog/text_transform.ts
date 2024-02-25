import { Transform, type TransformCallback } from 'node:stream';

import { DefaultLogLevel } from './index.js';
import { anyToError } from '../usefule/core.js';
import { type LogLevels } from './interface.js';

function includesWhitespace(str: string): boolean {
	return (
		str.includes(' ') ||
		str.includes('\r\n') ||
		str.includes('\n') ||
		str.includes('\t')
	);
}

function formatDatetime(datetime: number): string {
	const date = new Date(datetime);
	return (
		date.getFullYear() +
		'/' +
		(date.getMonth() + 1).toString().padStart(2, '0') +
		'/' +
		date.getDate().toString().padStart(2, '0') +
		' ' +
		date.getHours().toString().padStart(2, '0') +
		':' +
		date.getMinutes().toString().padStart(2, '0') +
		':' +
		date.getSeconds().toString().padStart(2, '0')
	);
}

export class TextTransform extends Transform {
	private labels: Record<number, string> = {};
	private buffer: string = '';

	constructor(
		levels: LogLevels = DefaultLogLevel,
		private eol: '\n' | '\r\n' = '\n',
	) {
		super({ readableObjectMode: true, writableObjectMode: true });

		for (const label in levels) {
			this.labels[levels[label]] = label;
		}
	}

	_transform(
		chunk: any,
		_encoding: BufferEncoding,
		callback: TransformCallback,
	): void {
		this.buffer += chunk;
		if (!this.buffer.includes(this.eol)) {
			callback();
			return;
		}

		const logs = this.buffer
			.split(this.eol)
			.filter(log => log.trim() !== '');

		if (logs.length < 1) {
			callback();
			return;
		} else if (logs.at(-1)?.trimEnd().endsWith('}')) {
			this.buffer = '';
		} else {
			this.buffer = logs.pop() ?? '';
		}

		for (const log of logs) {
			let data: any;
			try {
				data = JSON.parse(log);
			} catch (reason) {
				const error = anyToError(reason);
				callback(error);
				return;
			}

			let text = '';
			let time = '';
			let level = '';
			let message = '';
			for (const key in data) {
				const value = data[key];
				if (key === 'time' && typeof value === 'number') {
					time = formatDatetime(value);
					continue;
				} else if (key === 'level') {
					level = this.labels[value].toLocaleUpperCase();
					continue;
				} else if (key === 'msg') {
					message = value;
					continue;
				}

				const strValue = this.asString(value);
				if (strValue === undefined) continue;

				text += ' ' + key + '=' + strValue;
			}

			let output = time + ' ' + level;
			if (message) {
				output += ' ' + message;
			}
			if (text) {
				output += text;
			}
			output += this.eol;

			this.push(output);
		}
		callback();
	}

	private asString(value: any): string | undefined {
		let strValue: string;
		switch (typeof value) {
			case 'bigint':
			case 'function':
			case 'symbol':
			case 'undefined':
				// cannot happen because of JSON.parse()
				return undefined;
			case 'string':
				strValue = includesWhitespace(value)
					? '"' + value + '"'
					: value;
				break;
			// never infinite because of JSON.parse
			case 'number':
			case 'boolean':
				strValue = value.toString();
				break;
			case 'object':
				if (value === null) {
					strValue = 'null';
					break;
				}
				strValue = JSON.stringify(value);
				break;
		}
		return strValue;
	}
}
