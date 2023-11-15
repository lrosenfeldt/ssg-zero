import { writeFileSync } from 'node:fs';

const HOOK = `\
#!/bin/sh
npm run format
`;

const PRE_COMMIT_PATH = './.git/hooks/pre-commit';

function installHook() {
	try {
		writeFileSync(PRE_COMMIT_PATH, HOOK, {
			encoding: 'utf-8',
			flag: 'wx',
			mode: 0o755,
		});
	} catch (err) {
		console.error(`Failed to install hook:`, err);
	}
	console.log(`Successfully installed pre-commit hook for formatting.`);
}

installHook();
