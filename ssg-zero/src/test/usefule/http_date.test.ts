import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { toHttpDate } from '../../lib/usefule/http_date.js';

describe('http date', function () {
	const table = [
		{
			time: Date.UTC(2022, 1, 11, 9, 17, 12),
			expected: 'Sat, 11 Feb 2022 09:17:12 GMT',
		},
		{
			time: Date.UTC(2021, 3, 9, 8, 30, 17),
			expected: 'Sat, 09 Apr 2021 08:30:17 GMT',
		},
		{
			time: Date.UTC(1970, 0, 1, 0, 0, 0),
			expected: 'Fri, 01 Jan 1970 00:00:00 GMT',
		},
	];

	for (const { time, expected } of table) {
		const date = new Date(time);
		test(`formats ${date.toUTCString()} according to the RFC 5322 spec`, function () {
			assert.equal(toHttpDate(date), expected);
		});
	}
});
