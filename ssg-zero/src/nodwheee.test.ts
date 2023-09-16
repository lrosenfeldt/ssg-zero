import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { EventEmitter } from './nodwheee.js';

suite('nodwheee.ts', function () {
	suite('EventEmitter', function () {
		test('is a typesafe event emitter', function (t) {
			type HammerTime = {
				whatTime: (first: 'hammer', second: 'time') => number;
			};
			const emitter = new EventEmitter<HammerTime>();

			const spy = t.mock.fn<HammerTime['whatTime']>();

			emitter.on('whatTime', spy);
			emitter.emit('whatTime', 'hammer', 'time');
			emitter.emit('whatTime', 'hammer', 'time');
			emitter.emit('whatTime', 'hammer', 'time');

			assert.equal(spy.mock.callCount(), 3);

      // just for typescript
      // @ts-expect-error
      emitter.emit('nope')
		});
	});
});
