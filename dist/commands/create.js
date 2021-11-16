"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function create(kernel, { appPath, type, name, description, isHelp }) {
    kernel.run({
        name: 'create',
        opts: {
            appPath,
            type,
            name,
            description,
            isHelp
        }
    });
}
exports.default = create;
