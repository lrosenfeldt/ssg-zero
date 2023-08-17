"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSG = void 0;
const promises_1 = require("fs/promises");
const passthroughMarker = Symbol('passthrough');
class SSG {
    inputDir;
    outputDir;
    constructor(inputDir, outputDir, fileHandlers) {
        this.inputDir = inputDir;
        this.outputDir = outputDir;
    }
    async setup() {
        await (0, promises_1.mkdir)(this.outputDir, { recursive: true });
    }
}
exports.SSG = SSG;
//# sourceMappingURL=ssg.js.map