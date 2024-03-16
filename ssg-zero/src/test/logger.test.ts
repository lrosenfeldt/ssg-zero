import assert from 'node:assert/strict';
import { describe as suite, test, mock, beforeEach } from 'node:test';

import { time } from '../lib/logger.js';

suite('logger time function', function () {
	const performanceNow = mock.method(performance, 'now', () => 0);
	time(0);

	beforeEach(function () {
		performanceNow.mock.resetCalls();
	});

	test('formats correctly in milliseconds range', function () {
		performanceNow.mock.mockImplementationOnce(() => 127, 0);

		assert.equal(time(0), '00:00.127');
	});
	test('formats correctly in seconds range', function () {
		performanceNow.mock.mockImplementationOnce(() => 12_340, 0);
		const result = time(0);

		assert.equal(result, '00:12.340');
	});
	test('formats correctly in minutes range', function () {
		performanceNow.mock.mockImplementationOnce(
			() => 34 * 60 * 1_000 + 49_912,
			0,
		);
		const result = time(0);

		assert.equal(result, '34:49.912');
	});
	test('resets when reaching hours range', function () {
		performanceNow.mock.mockImplementationOnce(
			() => 62 * 60 * 1_000 + 31_345,
			0,
		);
		performanceNow.mock.mockImplementationOnce(() => 420, 1);

		assert.equal(time(0), '62:31.345');
		assert.equal(performanceNow.mock.callCount(), 2);
	});
});
