import { opendir, type Dir, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';

export class FileWalker extends Readable {
	private dir!: Dir;
	private running: boolean = false;

	constructor(private root: string) {
		super({ objectMode: true });
	}

	_construct(callback: (error?: Error | null | undefined) => void): void {
		opendir(this.root, { recursive: true }, (error, dir) => {
			if (error) {
				callback(error);
				return;
			}

			this.dir = dir;
			callback();
		});
	}

	_read(): void {
		if (this.running) {
			return;
		}

		const onRead = (
			error: NodeJS.ErrnoException | null,
			entry: Dirent | null,
		) => {
			if (error) {
				this.destroy(error);
				return;
			}

			if (entry) {
				if (entry.isFile()) {
					// @ts-expect-error parentPath is node v21, to new for @types/node
					this.push(join(entry.parentPath, entry.name));
				}
				this.dir.read(onRead);
				return;
			}

			this.dir.close(error => {
				if (error) {
					this.destroy(error);
					return;
				}

				this.push(null);
			});
		};

		this.running = true;
		this.dir.read(onRead);
	}
}
