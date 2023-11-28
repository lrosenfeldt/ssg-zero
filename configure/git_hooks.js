import { writeFileSync } from 'node:fs';

const HOOK = `\
#!/bin/sh

files=$(git status --porcelain=v2 | awk '/\\.ts|json|js|md|css$/ {print $9}')
echo $files
npm exec prettier -- --check $files
`;

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
