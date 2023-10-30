import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';

import { command, string, boolean, number, parse } from './here_we_go_again.js';

suite('Parser', function () {
  class Build {
    @string({ short: 'c', description: 'Relative path to config file' })
    config: string = 'config.json';

    @number({description: 'Number of threads to use'})
    concurrency?: number;
  }

  class Serve {
    @number({ short: 'p', description: 'Port to serve build output on' })
    port: number = 4269;

    @string({ short: 'C', description: 'Method to use for file hashing' })
    cachingMethod: string = 'advanced-btree5';
  }


  class Cli {
    @boolean({short: 'h', description: 'Show this message'})
    help?: boolean;

    @number({ description: 'Verbosity of log output' })
    logLevel: number = 2;

    @command([Build, Serve])
    command?: Build | Serve;
  }

  test('parses arguments with serve command', function () {
    const args = ['-h', '--log-level=1', 'serve', '-p3333', '--caching-method', 'string-compare'];

    const expectedServe = new Serve();
    expectedServe.port = 3333;
    expectedServe.cachingMethod = 'string-compare';

    const expectedCli = new Cli();
    expectedCli.command = expectedServe;
    expectedCli.help = true;
    expectedCli.logLevel = 1;

    assert.deepEqual(parse(args, Cli), expectedCli);
  });
});
