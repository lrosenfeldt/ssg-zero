import { opendir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { anyToError, type FileReader } from './core.js';

export type WatchChangeEvent = {
	type: 'change';
	filePath: string;
};

export type WatchCreateEvent = {
	type: 'create';
	filePath: string;
};

export type WatchDeleteEvent = {
	type: 'delete';
	filePath: string;
};

export type WatchEvent = WatchChangeEvent | WatchCreateEvent | WatchDeleteEvent;

export type Hash = number;

export type WatcherOptions = {
	maxInterval?: number;
	disableDelete?: boolean;
};

export class Watcher {
	private cache: Map<string, Hash> = new Map();
	private initialized: boolean = false;

	constructor(
		private target: string,
		private maxInterval: number,
		private disableDelete: boolean,
	) {}

	async init(): Promise<void> {
		this.cache = new Map();

		const dir = await opendir(this.target, { recursive: true });
		for await (const entry of dir) {
			if (!entry.isFile()) continue;
			// @ts-expect-error parentPath is to new for @types/node
			const filePath = join(entry.parentPath, entry.name);
			const hash = await this.safeFileHash(filePath);
			if (hash !== undefined) {
				this.cache.set(filePath, hash);
			}
		}

		this.initialized = true;
	}

	async *watch(): AsyncGenerator<WatchEvent> {
		if (!this.initialized) {
			throw new Error('Can not watch before initialization');
		}

		try {
			while (true) {
				const start = performance.now();

				yield* this.watchGeneration();

				const delta = performance.now() - start;
				const delay = Math.max(this.maxInterval - delta, 0);

				await sleep(delay);
			}
		} finally {
			this.initialized = false;
		}
	}

	private async *watchGeneration(): AsyncGenerator<WatchEvent> {
		const dir = await opendir(this.target, { recursive: true });
		const snapshot = this.cache;
		this.cache = new Map();

		for await (const entry of dir) {
			if (!entry.isFile()) continue;
			// @ts-expect-error parentPath is to new for @types/node
			const filePath = join(entry.parentPath, entry.name);
			const currentHash = await this.safeFileHash(filePath);
			// if file was deleted between discovery and now, just ignore that
			if (currentHash === undefined) continue;
			const snapshotHash = snapshot.get(filePath);

			if (snapshotHash === undefined) {
				yield { type: 'create', filePath };
			} else if (snapshotHash !== currentHash) {
				yield { type: 'change', filePath };
			}
			this.cache.set(filePath, currentHash);
		}

		if (this.disableDelete) {
			return;
		}

		for (const [filePath, _] of snapshot) {
			if (!this.cache.has(filePath)) {
				yield { type: 'delete', filePath };
			}
		}
	}

	private async safeFileHash(path: string): Promise<number | undefined> {
		try {
			const stats = await stat(path);
			return stats.ctimeMs;
		} catch (reason) {
			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				return undefined;
			}
			throw error;
		}
	}
}

export async function* watchAsReader(
	target: string,
	options: WatcherOptions = {},
): FileReader {
	const watcher = new Watcher(
		target,
		options.maxInterval ?? 500,
		options.disableDelete ?? false,
	);

	await watcher.init();
	for await (const { type, filePath } of watcher.watch()) {
		if (type === 'delete') continue;
		yield filePath;
	}
}
