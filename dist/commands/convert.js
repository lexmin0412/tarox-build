"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function convert(kernel, { appPath, isHelp }) {
    kernel.run({
        name: 'convert',
        opts: {
            appPath,
            isHelp
        }
    });
}
exports.default = convert;
