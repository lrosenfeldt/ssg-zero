import { EventEmitter as LameEmitter } from 'node:events';

export type EventMap = Record<string | symbol, (...args: any[]) => any>;

export interface EventEmitter<Listeners extends EventMap> {
	addListener<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	prependListener<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	prependOnceListener<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	removeListener<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	removeAllListeners(event?: keyof Listeners): this;
	once<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	on<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	off<Event extends keyof Listeners>(
		event: Event,
		listener: Listeners[Event],
	): this;
	emit<Event extends keyof Listeners>(
		event: Event,
		...args: Parameters<Listeners[Event]>
	): boolean;
	eventNames<Event extends keyof Listeners>(): Event[];
	listenerCount(type: keyof Listeners): number;
	listeners<Event extends keyof Listeners>(type: Event): Listeners[Event][];
	rawListeners<Event extends keyof Listeners>(
		type: Event,
	): Listeners[Event][];
	getMaxListeners(): number;
	setMaxListeners(n: number): this;
}

export class EventEmitter<Listeners extends EventMap> extends LameEmitter {}
