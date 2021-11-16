"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function build(kernel, { platform, isWatch, release, port, ui, uiIndex, page, component, envHasBeenSet = false, plugin, isHelp }) {
    if (plugin) {
        if (typeof plugin === 'boolean') {
            plugin = 'weapp';
        }
        platform = 'plugin';
    }
    if (platform === 'plugin') {
        plugin = plugin || 'weapp';
    }
    if (ui) {
        platform = 'ui';
    }
    let nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
        if (isWatch) {
            nodeEnv = 'development';
        }
        else {
            nodeEnv = 'production';
        }
    }
    process.env.NODE_ENV = nodeEnv;
    process.env.TARO_ENV = platform;
    kernel.run({
        name: 'build',
        opts: {
            platform,
            isWatch,
            release,
            port,
            ui,
            uiIndex,
            page,
            component,
            envHasBeenSet,
            plugin,
            isHelp
        }
    });
}
exports.default = build;
