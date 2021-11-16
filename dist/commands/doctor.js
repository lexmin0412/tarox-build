"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function doctor(kernel, { appPath, isHelp }) {
    kernel.run({
        name: 'doctor',
        opts: {
            appPath,
            isHelp
        }
    });
}
exports.default = doctor;
