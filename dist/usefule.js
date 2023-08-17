"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exists = void 0;
const promises_1 = require("node:fs/promises");
function anyToError(reason) {
    let errorMessage;
    switch (typeof reason) {
        case 'object':
            if (reason instanceof Error) {
                return reason;
            }
            else if (reason === null) {
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
        default:
            errorMessage = `Failed with ${reason} of unhandled {typeof reason}. This is an implementation error '${__filename}'.`;
            break;
    }
    return new Error(errorMessage, { cause: reason });
}
async function exists(path) {
    try {
        await (0, promises_1.stat)(path);
        return true;
    }
    catch (reason) {
        const error = anyToError(reason);
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
exports.exists = exists;
//# sourceMappingURL=usefule.js.map