import { opendir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { anyToError } from './core.js';

export type WatchChangeEvent = {
	type: 'change';
	filePath: string;
	content: string;
};

export type WatchCreateEvent = {
	type: 'create';
	filePath: string;
	content: string;
};

export type WatchDeleteEvent = {
	type: 'delete';
	filePath: string;
	content: '';
};

export type WatchEvent = WatchChangeEvent | WatchCreateEvent | WatchDeleteEvent;

export type Hash = string;

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
			const content = await this.safeReadFile(filePath);
			if (content !== undefined) {
				this.cache.set(filePath, content);
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
			const content = await this.safeReadFile(filePath);
			// if file was deleted between discovery and now, just ignore that
			if (content === undefined) continue;
			const cachedContent = snapshot.get(filePath);

			if (cachedContent === undefined) {
				yield { type: 'create', filePath, content };
			} else if (cachedContent !== content) {
				yield { type: 'change', filePath, content };
			}
			this.cache.set(filePath, content);
		}

		if (this.disableDelete) {
			return;
		}

		for (const [filePath, _] of snapshot) {
			if (!this.cache.has(filePath)) {
				yield { type: 'delete', filePath, content: '' };
			}
		}
	}

	private async safeReadFile(path: string): Promise<string | undefined> {
		try {
			return await readFile(path, 'utf-8');
		} catch (reason) {
			const error = anyToError(reason);
			if (error.code === 'ENOENT') {
				return undefined;
			}
			throw error;
		}
	}
}

export async function* watch(
	target: string,
	options: WatcherOptions = {},
): AsyncGenerator<WatchEvent> {
	const watcher = new Watcher(
		target,
		options.maxInterval ?? 500,
		options.disableDelete ?? false,
	);

	await watcher.init();
	yield* watcher.watch();
}
