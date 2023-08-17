"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const ssg_js_1 = require("./ssg.js");
const promises_1 = require("node:fs/promises");
const usefule_1 = require("./usefule");
(0, node_test_1.describe)('ssg.ts', () => {
    (0, node_test_1.describe)('SSG', () => {
        (0, node_test_1.describe)('setup', () => {
            const inputDir = 'fixtures/pages_dump';
            const outputDir = 'fixtures/dist_dump';
            const ssg = new ssg_js_1.SSG(inputDir, outputDir, new Map());
            (0, node_test_1.before)(async () => {
                await (0, promises_1.mkdir)(inputDir, { recursive: true });
                await (0, promises_1.rm)(outputDir, { force: true, recursive: true });
            });
            (0, node_test_1.after)(async () => {
                await (0, promises_1.rm)(outputDir, { force: true, recursive: true });
            });
            (0, node_test_1.it)('setups the output directory', async (t) => {
                await t.test('has no directories initially', async () => {
                    strict_1.default.equal(await (0, usefule_1.exists)(outputDir), false, `Output directory ${outputDir} on start of the test run.`);
                });
                await t.test('runs successfully', async () => {
                    await strict_1.default.doesNotReject(async () => await ssg.setup());
                });
                await t.test('creates output directory', async () => {
                    strict_1.default.equal(await (0, usefule_1.exists)(outputDir), true, `Output directory ${outputDir} was not created during setup.`);
                });
            });
        });
    });
});
//# sourceMappingURL=ssg.test.js.map