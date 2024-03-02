import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { MIMEType } from 'node:util';

import { anyToError } from './core.js';
import { mime } from './mime.js';

suite('mime', function () {
	for (const extension in mime) {
		test(`mime type '${extension}' is valid`, function () {
			try {
				new MIMEType(mime[extension].mimeType);
			} catch (reason) {
				const error = anyToError(reason);
				assert.fail(error);
			}
		});
	}
});
