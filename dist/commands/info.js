"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function info(kernel, { appPath, rn, isHelp }) {
    kernel.run({
        name: 'info',
        opts: {
            appPath,
            rn,
            isHelp
        }
    });
}
exports.default = info;
