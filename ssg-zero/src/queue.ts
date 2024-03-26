class Task<Result> {
	static task<Result>(id: number, value: Result) {
		if (this.pool.length === 0) {
			return new Task(id, value);
		}
		const task = this.pool.pop()!;
		task.id = id;
		task.value = value;
		return task;
	}

	static release(task: Task<any>) {
		this.pool.push(task);
	}

	private static pool: Array<Task<any>> = [];

	constructor(
		public id: number,
		public value: Result,
	) {}
}

export class Queue<Input, Resolved> {
	private queue: Map<number, Promise<Task<Resolved>>> = new Map();
	private buffer: Input[] = [];
	private maxId: number = 0;

	constructor(
		private action: (arg: Input) => Promise<Resolved>,
		private concurrency: number,
	) {}

	[Symbol.asyncIterator](): AsyncIterator<Resolved> {
		return {
			next: async (): Promise<IteratorResult<Resolved>> => {
				if (this.queue.size === 0) {
					return { done: true, value: undefined };
				}

				const value = await this.pull();
				return { done: false, value };
			},
		};
	}

	async drain(): Promise<void> {
		while (this.queue.size > 0) {
			await this.pull();
		}
	}

	push(input: Input): void {
		if (this.queue.size < this.concurrency) {
			const id = this.getId();
			const promise = this.action(input).then(value =>
				Task.task(id, value),
			);
			this.queue.set(id, promise);
		} else {
			this.buffer.push(input);
		}
	}

	async pull(): Promise<Resolved> {
		if (this.queue.size === 0) {
			throw new Error(`Can't pull from an empty queue`);
		}

		const task = await Promise.race(this.queue.values());
		this.queue.delete(task.id);
		Task.release(task);

		if (this.buffer.length > 0) {
			this.push(this.buffer.pop()!);
		}

		return task.value;
	}

	private getId(): number {
		return this.maxId++;
	}
}
