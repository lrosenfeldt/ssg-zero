import { mkdir } from 'fs/promises'

const passthroughMarker = Symbol('passthrough')
export type PassthroughMarker = typeof passthroughMarker

type Renderer = {
	generates: string
	render: (content: string) => string | Promise<string>
}

type FileHandler = PassthroughMarker | Renderer

export class SSG {
	constructor(
		private readonly inputDir: string,
		private readonly outputDir: string,
		fileHandlers: Map<string, FileHandler>,
	) {}

	async setup(): Promise<void> {
		await mkdir(this.outputDir, { recursive: true })
	}

  async build(): Promise<void> {

  }
}
