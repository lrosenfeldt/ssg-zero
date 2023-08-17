"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const usefule_js_1 = require("./usefule.js");
(0, node_test_1.describe)('usefule', () => {
    (0, node_test_1.describe)('exists', () => {
        (0, node_test_1.it)('resolves to false if a file does not exists', async () => {
            const doesItExist = await (0, usefule_js_1.exists)('fixtures/does/not/exist');
            strict_1.default.equal(doesItExist, false);
        });
        (0, node_test_1.it)('resolves to true if a file does exist', async () => {
            const doesItExist = await (0, usefule_js_1.exists)('fixtures/pages/index.html');
            strict_1.default.equal(doesItExist, true);
        });
    });
});
//# sourceMappingURL=usefule.test.js.map