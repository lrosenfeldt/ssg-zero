import { Buffer } from 'node:buffer';
import { Transform, type TransformCallback } from 'node:stream';

export class Injector extends Transform {
	private injection: Buffer;
	private injectAfter: Buffer;
	private injectionDone: boolean = false;
	private cursor: number = 0;
	private isInPattern: boolean = false;

	constructor(injectAfter: string, injection: string) {
		super({
			readableObjectMode: false,
			writableObjectMode: false,
			decodeStrings: true,
			encoding: 'utf-8',
		});

		this.injection = Buffer.from(injection);
		this.injectAfter = Buffer.from(injectAfter);
	}

	_transform(
		chunk: Buffer,
		encoding: BufferEncoding,
		callback: TransformCallback,
	): void {
		// @ts-expect-error @types/node doesnt know about this special value
		if (encoding !== 'buffer') {
      let typeName: string = typeof chunk;
      if (typeName === 'object') {
        typeName = chunk.constructor.name || 'object';
      }
			callback(
				new Error(
					`Invalid encoding ${encoding}, Injector only works on buffers not on chunk of type '${typeName}'.`,
				),
			);
			return;
		}

		if (this.injectionDone) {
			this.push(chunk);
			callback();
			return;
		}

		let i = 0;
		while (i < chunk.length && this.cursor < this.injectAfter.length) {
			if (chunk[i] === this.injectAfter[this.cursor]) {
				this.isInPattern = true;
				this.cursor++;
			} else {
				this.isInPattern = false;
				this.cursor = 0;
			}
			++i;
		}

		if (this.cursor >= this.injectAfter.length) {
			const before = chunk.subarray(0, i);
			const after = chunk.subarray(i + this.injectAfter.length);

			this.push(before);
			this.push(this.injection);
			this.push(after);
			this.injectionDone = true;
			callback();

			this.cursor = 0;
			this.isInPattern = false;
			return;
		}

		if (this.isInPattern) {
			const before = chunk.subarray(0, i);
			this.push(before);
			callback();
			return;
		}

		this.push(chunk);
		callback();
		return;
	}
}
