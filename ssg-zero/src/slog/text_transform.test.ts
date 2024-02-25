import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { PassThrough } from 'node:stream';

import { DefaultLogLevel } from './index.js';
import { TextTransform } from './text_transform.js';

suite('TextTransform', function () {
	test('turns json stream in more readable text format', async function () {
		const input = new PassThrough({
			readableObjectMode: true,
			writableObjectMode: true,
		});
		const eol = '\n';
		const time = 907_000;
		const timeText = '1970/01/01 01:15:07';
		let messages = [
			{
				level: DefaultLogLevel.info,
				time,
				msg: 'Hi there',
			},
			{
				level: DefaultLogLevel.error,
				time,
				msg: 'Uh oh',
				reason: false,
			},
			{
				level: DefaultLogLevel.info,
				time,
				msg: 'Everyone else is an asshole',
				banger: true,
				meta: {
					track: 1,
					album: 'Candy Coated Fury',
				},
				will: undefined,
				be: () => undefined,
				ignored: Symbol(),
			},
		];
		const textTransform = new TextTransform(DefaultLogLevel, eol);
		const data: string[] = [];
		input.pipe(textTransform);

		// write into stream
		for (const message of messages) {
			input.write(JSON.stringify(message) + eol);
		}

		// protect against non resolving promise
		setTimeout(() => {
			if (data.length < 3) {
				assert.fail(
					`Timed out before getting 3 messages, got only ${data.length} so far`,
				);
			}
		}, 100);

    let msg: string;
    for await (msg of textTransform) {
      data.push(msg);
      if (data.length >= 3) break;
    }

		assert.equal(data[0], `${timeText} INFO Hi there${eol}`);
		assert.equal(data[1], `${timeText} ERROR Uh oh reason=false${eol}`);
		assert.equal(
			data[2],
			`${timeText} INFO Everyone else is an asshole banger=true meta={"track":1,"album":"Candy Coated Fury"}${eol}`,
		);
	});
});
