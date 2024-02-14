import { Writable } from 'node:stream';

import { type LogLevels, type Timestamp } from './interface.js';

export const backendSym = Symbol('slog.backend');

export class SlogBackend {
	private prefixCache: Record<number, string> = {};
	private maxDepth: number = 5;

	constructor(
		levels: LogLevels,
		private destination: Writable,
		private time: Timestamp,
	) {
		this.initPrefixCache(levels);
	}

	write(
		level: number,
		message: string | undefined,
		attrs: object | undefined,
	): void {
		let data = this.prefixCache[level] + this.time();
		if (message) {
			data += `,"msg":${JSON.stringify(message)}`;
		}
		if (attrs) {
			data += ',' + this.asJson(attrs).slice(1);
		} else {
			data += '}';
		}
		this.destination.write(data);
	}

	initPrefixCache(levels: LogLevels) {
		for (const label in levels) {
			const value = levels[label];

			this.prefixCache[value] = `{"level":${value},"time":`;
		}
	}

	private asJson(obj: object): string {
		try {
			return JSON.stringify(obj);
		} catch {
			return stringifySafe(obj, 2, this.maxDepth);
		}
	}
}

/**
 * @param depth current recursion depth
 * @param maxDepth maximum recursion depth, inclusive
 * @description stringify an object but stop at a certain level to avoid circular references
 */
export function stringifySafe(obj: object, depth = 1, maxDepth = 5): string {
	// stop recursion
	if (depth > maxDepth) {
		return '"[deep object]"';
	}

	let json = '';
	loop: for (const key in obj) {
		const value = (obj as any)[key];
		let strValue: string;

		switch (typeof value) {
			case 'undefined':
			case 'function':
				continue loop;
			case 'symbol':
				throw new Error('unimplemented. symbol what???');
			case 'bigint':
				throw new Error('unimplemented. bigint what???');
			case 'string':
				// escape strings
				strValue = JSON.stringify(value);
				break;
			case 'number':
				if (!Number.isFinite(value)) {
					strValue = 'null';
					break;
				}
			// fallthrough
			case 'boolean':
				strValue = value.toString();
				break;
			case 'object':
				if (value === null) {
					strValue = 'null';
					break;
				}
				strValue = stringifySafe(value, depth + 1, maxDepth);
		}

		json += `,"${key}":${strValue}`;
	}
	return '{' + json.slice(1) + '}';
}
