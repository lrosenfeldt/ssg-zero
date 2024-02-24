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

  _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer += chunk;
    if (!this.buffer.includes(this.eol)) {
      callback();
      return;
    }

    const logs = this.buffer.split(this.eol);
    if (logs.length > 1) {
      // last part may be incomplete
      this.buffer = logs.pop()!;
    } else {
      this.buffer = '';
    }

    for (const logEntry of logs) {
      let data: any;
      try {
        data = JSON.parse(logEntry);
      } catch (reason) {
        const error = anyToError(reason);
        callback(error);
        return;
      }

      let log = ''
      for (const key in data) {
        const value = data[key];
        if (key === 'level') {
          log += ' ' + 'LEVEL=' + this.labels[value];
          continue;
        } else if (key === 'time' && typeof value === 'number') {
          log += ' ' + 'TIME=' + new Date(value).toISOString();
          continue;
        }

        let strValue: string;
        switch (typeof value) {
          case 'bigint':
          case 'function':
          case 'symbol':
          case 'undefined':
            // cannot happen because of JSON.parse()
            continue;
          case 'string':
            strValue = includesWhitespace(value) ? '"' + value + '"' : value;
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

        log += ' ' + key.toLocaleUpperCase() + '=' + strValue;
      }
      log = log.slice(1) + this.eol;
      console.log(log);
      this.push(log);
    }
    callback();
  }
}
