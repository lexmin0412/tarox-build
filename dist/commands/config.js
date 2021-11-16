"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function config(kernel, { cmd, key, value, json, isHelp }) {
    kernel.run({
        name: 'config',
        opts: {
            cmd,
            key,
            value,
            json,
            isHelp
        }
    });
}
exports.default = config;
