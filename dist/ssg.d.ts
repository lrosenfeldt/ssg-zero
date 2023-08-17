declare const passthroughMarker: unique symbol;
export type PassthroughMarker = typeof passthroughMarker;
type Renderer = {
    generates: string;
    render: (content: string) => string | Promise<string>;
};
type FileHandler = PassthroughMarker | Renderer;
export declare class SSG {
    private readonly inputDir;
    private readonly outputDir;
    constructor(inputDir: string, outputDir: string, fileHandlers: Map<string, FileHandler>);
    setup(): Promise<void>;
}
export {};
//# sourceMappingURL=ssg.d.ts.map