import { Writable } from 'node:stream';

import { type LogLevels, type Timestamp } from './interface.js';

export const backendSym = Symbol('slog.backend');

export class SlogBackend {
	private prefixCache: Record<number, string> = {};
	private maxDepth: number = 5;

	private destination: Writable;
	private childBindings: string;
	private time: Timestamp;

	constructor(
		levels: LogLevels,
		destination: Writable,
		bindings: Record<string, any> | undefined,
		time: Timestamp,
	) {
		this.destination = destination;
		this.childBindings =
			bindings === undefined
				? ''
				: ',' + this.asJson(bindings).slice(1, -1);
		this.time = time;

		this.initPrefixCache(levels);
	}

	child(
		levels: LogLevels,
		bindings: Record<string, any> | undefined,
	): SlogBackend {
		const child = new SlogBackend(
			levels,
			this.destination,
			bindings,
			this.time,
		);
		// parent bindings should come first, so JSON.parse will use value from child in case of
		// conflict
		child.childBindings = this.childBindings + child.childBindings;
		console.log('child', child.childBindings);
		return child;
	}

	write(
		level: number,
		message: string | undefined,
		attrs: object | undefined,
	): void {
		let data = this.prefixCache[level] + this.time() + this.childBindings;
		console.log('current data', data, this.childBindings);
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
					strValue = JSON.stringify(value);
				case 'object':
					if (value === null) {
						strValue = 'null';
						break;
					}
					strValue = this.stringify(value);
					break;
			}

			json += `,"${key}":${strValue}`;
		}
		return '{' + json.slice(1) + '}';
	}

	private initPrefixCache(levels: LogLevels) {
		for (const label in levels) {
			const value = levels[label];

			this.prefixCache[value] = `{"level":${value},"time":`;
		}
	}

	private stringify(obj: object): string {
		try {
			return JSON.stringify(obj);
		} catch {
			return stringifySafe(obj, 3, this.maxDepth);
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
