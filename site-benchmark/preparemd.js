import fs from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
let target = args.shift();
if (!target) {
	console.error('Usage: $0 TARGET_DIR');
	process.exit(1);
}

const dir = await fs.opendir(target, { recursive: true });
let running = [];
for await (const entry of dir) {
	if (!entry.isFile()) continue;

	// @ts-expect-error types/node doesnt know about node v21 features
	const filePath = join(entry.parentPath, entry.name);
	let content = await fs.readFile(filePath, 'utf-8');

	const frontmatterEnd = content.indexOf('---', 4);
	const json =
		'{\n' +
		content
			.slice(3, frontmatterEnd)
			.trim()
			.split('\n')
			.map(line => {
				const [key, value] = line.split(':');
				return `  "${key}": "${value}"`;
			})
			.join(',\n') +
		'\n}';

	content = json + content.slice(frontmatterEnd + 3);
	// console.log(filePath);
	// console.log(content);
	// console.log();
	if (running.length === 10) {
		await Promise.all(running);
		running = [];
	} else {
		running.push(fs.writeFile(filePath, content, 'utf-8'));
	}
}

if (running.length > 0) await Promise.all(running);
