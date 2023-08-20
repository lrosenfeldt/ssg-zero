import { extname, join } from 'node:path'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { walkFiles } from './usefule.js'
import { ConsoleLogger, LogLevel } from './logger.js'

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
		private logger = new ConsoleLogger(LogLevel.Debug),
	) {}

	async setup(): Promise<void> {
		await mkdir(this.outputDir, { recursive: true })
	}

	async build(): Promise<void> {
		for await (const file of walkFiles(this.inputDir)) {
			const inputFilePath = join(file.dir, file.base)
			const fileType = extname(inputFilePath)
			this.logger.debug(
				`Found file ${inputFilePath} with extension ${fileType}.`,
			)

			const renderer = this.fileHandlers.get(fileType)
			if (renderer === undefined) {
				this.logger.info(
					`Ignoring file '${inputFilePath}' because of unhandled extension '${fileType}'.`,
				)
				continue
			}

			if (renderer === SSG.passthroughMarker) {
				await this.passthroughFile(inputFilePath)
				continue
			}

			// render
			const targetDir = file.dir.replace(this.inputDir, this.outputDir)
			this.logger.debug(
				`Prepare rendering of ${inputFilePath}, creating directory ${targetDir}.`,
			)
			await mkdir(targetDir, { recursive: true })

			const targetFile = join(
				targetDir,
				file.base.replace(fileType, renderer.generates),
			)
			this.logger.info(`Rendering ${inputFilePath} to ${targetFile}.`)

			const fileContent = await readFile(inputFilePath, 'utf-8')
			this.logger.debug(
				`Start generating rendered content for ${targetFile}.`,
			)
			const outputContent = await renderer.render(fileContent)
			this.logger.debug(
				`Finished generating rendered content for ${targetFile}.`,
			)
			await writeFile(targetFile, outputContent, 'utf-8')
		}
	}

	private async passthroughFile(filePath: string): Promise<void> {
		const outputFilePath = filePath.replace(this.inputDir, this.outputDir)
		this.logger.info(`Copying file '${filePath}' to '${outputFilePath}'.`)

		await cp(filePath, outputFilePath, {
			force: true,
			recursive: true,
		})
		return
	}
}
