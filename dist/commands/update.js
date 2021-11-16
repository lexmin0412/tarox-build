"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function update(kernel, { appPath, updateType, version, isHelp }) {
    kernel.run({
        name: 'update',
        opts: {
            appPath,
            updateType,
            version,
            isHelp
        }
    });
}
exports.default = update;
