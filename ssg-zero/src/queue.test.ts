import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { setTimeout as sleep } from 'node:timers/promises';

import { Queue } from './queue.js';

describe('queue', function () {
	test('rejects if pulling from an empty queue', function () {
		const queue = new Queue(() => Promise.resolve(1), 5);

		assert.rejects(async () => await queue.pull());
	});
	test('drain waits until all tasks are finished', async function () {
		const collected: Set<string> = new Set();
		const action = async (s: string) => {
			const result = await Promise.resolve(s.toLocaleUpperCase());
			collected.add(result);
			return result;
		};
		const queue = new Queue(action, 2);

		queue.push('a');
		queue.push('b');
		queue.push('o');
		queue.push('c');
		queue.push('d');

		await queue.drain();

		assert.deepEqual(collected, new Set(['A', 'B', 'O', 'C', 'D']));
	});
	test('pull returns fasted tasks first', async function () {
		const queue = new Queue(async (ms: number) => {
			await sleep(ms);
			return ms;
		}, 10);

		queue.push(30);
		queue.push(20);
		queue.push(10);

		assert.equal(await queue.pull(), 10);
		assert.equal(await queue.pull(), 20);
		assert.equal(await queue.pull(), 30);
	});
	test('queue can be iterated over', async function () {
		const queue = new Queue(async () => Promise.resolve(1), 10);

		queue.push(undefined);
		queue.push(undefined);
		queue.push(undefined);
		queue.push(undefined);
		queue.push(undefined);

		let sum = 0;
		for await (const num of queue) {
			sum += num;
		}

		assert.equal(sum, 5, 'A number got lost in the queue');
	});
});
