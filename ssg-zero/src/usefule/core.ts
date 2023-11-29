import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

export function anyToError(reason: unknown): NodeJS.ErrnoException {
	let errorMessage: string;
	switch (typeof reason) {
		case 'object':
			if (reason instanceof Error) {
				return reason;
			} else if (reason === null) {
				errorMessage = `Failed with value null.`;
				break;
			}
			errorMessage = `Failed with object of type ${reason.constructor.name}.`;
			break;
		case 'undefined':
			errorMessage = `Failed with value of undefined.`;
			break;
		case 'string':
		case 'bigint':
		case 'boolean':
		case 'number':
		case 'symbol':
			errorMessage = `Failed with value ${reason.toString()} of type ${typeof reason}.`;
			break;
		case 'function':
			errorMessage = `Failed with function ${reason.name}.`;
			break;
		/* node:coverage ignore next 3 */
		default:
			errorMessage = `Failed with ${reason} of unhandled {typeof reason}. This is an implementation error '${__filename}'.`;
			break;
	}
	return new Error(errorMessage, { cause: reason });
}

export async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (reason) {
		const error = anyToError(reason);
		if (error.code === 'ENOENT') {
			return false;
			/* node:coverage ignore next 3 */
		}
		throw error;
	}
}

export type UsefulePath = { dir: string; base: string };
export async function* walkFiles(root: string): AsyncGenerator<UsefulePath> {
	const dirs = [root];
	for (const dir of dirs) {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				dirs.push(join(dir, entry.name));
				continue;
			}
			if (entry.isFile()) {
				yield { dir, base: entry.name };
			}
		}
	}
}
