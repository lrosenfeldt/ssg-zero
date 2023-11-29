import { writeFileSync } from 'node:fs';

const HOOK = `\
#!/bin/sh
git diff --cached --name-only --diff-filter=d | \
  awk '/\\.ts|js|json/' | \
  xargs npm exec prettier -- --no-color --check`;

const PRE_COMMIT_PATH = './.git/hooks/pre-commit';

function installHook(config) {
	try {
		writeFileSync(PRE_COMMIT_PATH, HOOK, {
			encoding: 'utf-8',
			flag: config.flag,
			mode: 0o755,
		});
	} catch (err) {
		console.error(`Failed to install hook:`, err);
	}
	console.log(`Successfully installed pre-commit hook for formatting.`);
}

function run(args) {
	const config = { flag: 'wx' };

	for (let arg = args[0]; arg !== undefined; arg = args.shift()) {
		switch (arg) {
			case '--allow-update':
				config.flag = 'w';
				break;
			default:
				console.log('Usage: git_hooks [--allow-update]');
				process.exit(1);
		}
	}

	installHook(config);
}

run(process.argv.slice(2));
