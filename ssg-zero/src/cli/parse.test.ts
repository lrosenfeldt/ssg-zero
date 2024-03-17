import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { cli } from './parse.js';

describe('parse cli args', function () {
  test('parses the default command', function () {
    const args = ['--help', '--config=file.js'];

    const { command, values } = cli(args);

    assert.equal(command, undefined);
    assert.deepEqual(values, {
      help: true,
      version: undefined,
      config: 'file.js',
    });
  });

  test('parses the build command', function() {
    const args = ['-h', 'build', '-vcMyFileIsSuperSpecial', '--parallel-fs', '4'];

    const { command, values } = cli(args);

    assert.equal(command, 'build');
    assert.deepEqual(values, {
      help: true,
      version: true,
      config: 'MyFileIsSuperSpecial',
      parallelFs: 4,
    });
  })
  test('parses the dev command', function() {
    const args = ['--config', 'build', 'dev', '-f2'];

    const { command, values } = cli(args);

    assert.equal(command, 'dev');
    assert.deepEqual(values, {
      help: undefined,
      version: undefined,
      config: 'build',
      parallelFs: 2,
      port: 4269,
    });
  })
  test('parses the serve command', function() {
    const args = ['-v', 'serve', '-hp', '6969'];

    const { command, values } = cli(args);

    assert.equal(command, 'serve');
    assert.deepEqual(values, {
      help: true,
      version: true,
      config: 'zero.config.js',
      port: 6969,
    });
  })
});
