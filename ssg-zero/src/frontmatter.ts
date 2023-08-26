import { EOL } from 'node:os'

export class UnexpectedEndOfJsonError
	extends Error
	implements NodeJS.ErrnoException
{
	constructor(str: string, startOfJson: number) {
		super(
			`Unexpected end of Json frontmatter, started at ${startOfJson}. Make sure that the closing '}' must be the single character on its own line.`,
		)
		this.cause = str
	}
}

export type ParserResult = {
	content: string
	data?: unknown
}
export function parse(input: string): ParserResult {
	if (!input.startsWith('{' + EOL)) {
		return { content: input }
	}

	let endOfJson = -1
	let json = '{'
	for (let position = 1 + EOL.length; position < input.length; ++position) {
		json += input[position]
		if (input.startsWith(EOL + '}' + EOL, position)) {
			endOfJson = position + 2 * EOL.length
			json += EOL + '}'
			break
		}
	}

	if (endOfJson === -1) {
		throw new UnexpectedEndOfJsonError(input, 0)
	}

	const data = JSON.parse(json)

	return {
		content: input.slice(endOfJson + 1),
		data,
	}
}
