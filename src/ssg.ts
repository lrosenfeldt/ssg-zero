import { extname, join } from 'node:path'
import { cp, mkdir } from 'node:fs/promises'

import { walkFiles } from './usefule.js'

const passthroughMarker = Symbol('passthrough')
export type PassthroughMarker = typeof passthroughMarker

export type Renderer = {
	generates: string
	render: (content: string) => string | Promise<string>
}

export type FileHandler = PassthroughMarker | Renderer

export class SSG {
	static passthroughMarker: PassthroughMarker = passthroughMarker

	constructor(
		private readonly inputDir: string,
		private readonly outputDir: string,
		private fileHandlers: Map<string, FileHandler>,
	) {}

	async setup(): Promise<void> {
		await mkdir(this.outputDir, { recursive: true })
	}

	async build(): Promise<void> {
		for await (const file of walkFiles(this.inputDir)) {
			const filePath = join(file.dir, file.base)
			const fileType = extname(file.base)

			const renderer = this.fileHandlers.get(fileType)
			if (renderer === undefined) {
				// ignore
			}

			if (renderer === SSG.passthroughMarker) {
				await this.passthroughFile(filePath)
			}

			// render
		}
	}

	private async passthroughFile(filePath: string): Promise<void> {
		await cp(filePath, filePath.replace(this.inputDir, this.outputDir), {
			force: true,
			recursive: true,
		})
		return
	}
}
