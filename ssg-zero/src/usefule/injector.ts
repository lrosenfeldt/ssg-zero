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

		let start = -1;
		for (
			let i = 0;
			i < chunk.length && this.cursor < this.injectAfter.length;
			++i
		) {
			if (chunk[i] === this.injectAfter[this.cursor]) {
				if (this.cursor === 0) {
					start = i;
				}
				this.cursor++;
				this.isInPattern = true;
			} else {
				this.cursor = 0;
				this.isInPattern = false;
				start = -1;
			}
		}

		if (this.cursor >= this.injectAfter.length) {
			if (start > 0) {
				this.push(chunk.subarray(0, start));
			}
			this.push(this.injectAfter);
			this.push(this.injection);
			if (start + this.injectAfter.length < chunk.length - 1) {
				this.push(chunk.subarray(start + this.injectAfter.length));
			}
			callback();

			this.injectionDone = true;
			this.cursor = 0;
			this.isInPattern = false;
			return;
		}

		if (this.isInPattern) {
			if (start > 0) {
				this.push(chunk.subarray(0, start));
			}
			callback();
			return;
		}

		this.push(chunk);
		callback();
		return;
	}
}
