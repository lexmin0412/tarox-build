"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
function customCommand(command, kernel, args) {
    if (typeof command === 'string') {
        const options = {};
        const excludeKeys = ['_', 'version', 'v', 'help', 'h'];
        Object.keys(args).forEach(key => {
            if (!excludeKeys.includes(key)) {
                options[key] = args[key];
            }
        });
        kernel.run({
            name: command,
            opts: {
                _: args._,
                options,
                isHelp: args.h,
                cliVersion: util_1.getPkgVersion()
            }
        });
    }
}
exports.default = customCommand;
