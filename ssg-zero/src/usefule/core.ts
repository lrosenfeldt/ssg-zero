import { join } from 'node:path';
import { opendir, readFile, stat } from 'node:fs/promises';

export function anyToError(reason: unknown): NodeJS.ErrnoException {
	let errorMessage: string;
	switch (typeof reason) {
		case 'object':
			if (reason instanceof Error) {
				return reason;
			} else if (reason === null) {
				errorMessage = `Failed with value null.`;
				break;
			} else if (Object.getPrototypeOf(reason) === null) {
        errorMessage = `Failed with object literal.`;
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
	return new Error(errorMessage);
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

export type FileEntry = {
	filePath: string;
	content: string;
};
export type FileEntriesReader = AsyncIterable<FileEntry>;

export async function* walkFiles(root: string): FileEntriesReader {
	const dir = await opendir(root, { recursive: true });
	for await (const entry of dir) {
		if (!entry.isFile()) continue;

		// @ts-expect-error parentPath is node v21, to new for @types/node
		const filePath = join(entry.parentPath, entry.name);
		const content = await readFile(filePath, 'utf-8');

		yield { filePath, content };
	}
}
