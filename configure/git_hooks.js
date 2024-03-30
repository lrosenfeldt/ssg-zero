import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const HOOK = `\
#!/bin/sh
git diff --cached --name-only --diff-filter=d | \
  awk '/\\.ts|js|json/' | \
  awk '!/profile\\.json/' | \
  xargs npm exec prettier -- --no-error-on-unmatched-pattern --check --no-color`;

const PRE_COMMIT_PATH = './.git/hooks/pre-commit';

function installHook(config) {
	try {
		writeFileSync(PRE_COMMIT_PATH, HOOK, {
			encoding: 'utf-8',
			flag: config.flag,
			mode: 0o755,
		});
		console.error(`Successfully installed pre-commit hook for formatting.`);
	} catch (error) {
		if (error.code === 'EEXIST') {
			console.error(
				`Commit hook already exists, use '--allow-update' to overwrite the file`,
			);
		} else {
			console.error(`Failed to install hook:`, error.message);
		}
		process.exit(2);
	}
}

function run(args) {
	const config = { flag: 'wx' };
	const usage = 'Usage: git_hooks [--allow-update | -u] [--help | -h]';

	try {
		const { values } = parseArgs({
			args,
			options: {
				'allow-update': {
					type: 'boolean',
					short: 'u',
				},
				help: {
					type: 'boolean',
					short: 'h',
				},
			},
			allowPositionals: false,
			strict: true,
		});

		if (values.help) {
			config.flag = 'w';
			console.error(usage);
			process.exit(0);
		}
		if (values['allow-update']) {
			config.flag = 'w';
		}
	} catch (error) {
		if (
			error.code === 'ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL' ||
			error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION'
		) {
			console.error(usage);
			process.exit(1);
		}
		throw error;
	}

	installHook(config);
}

run(process.argv.slice(2));
