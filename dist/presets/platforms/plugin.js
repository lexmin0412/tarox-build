"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
exports.default = (ctx) => {
    ctx.registerPlatform({
        name: 'plugin',
        useConfigName: 'mini',
        fn({ config }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { plugin, isWatch } = ctx.runOpts;
                const { sourcePath, outputPath } = ctx.paths;
                const { emptyDirectory, chalk, fs, PLATFORMS } = ctx.helper;
                const { WEAPP, ALIPAY } = PLATFORMS;
                const PLUGIN_JSON = 'plugin.json';
                const PLUGIN_MOCK_JSON = 'plugin-mock.json';
                const typeMap = {
                    [WEAPP]: '微信',
                    [ALIPAY]: '支付宝'
                };
                emptyDirectory(outputPath);
                if (plugin !== WEAPP && plugin !== ALIPAY) {
                    console.log(chalk.red('目前插件编译仅支持 微信/支付宝 小程序！'));
                    return;
                }
                console.log(chalk.green(`开始编译${typeMap[plugin]}小程序插件`));
                function buildWxPlugin() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield ctx.applyPlugins({
                            name: 'build',
                            opts: {
                                config: Object.assign({}, config, { isBuildPlugin: true, isWatch, outputRoot: `${config.outputRoot}/miniprogram`, platform: 'weapp', needClearOutput: false }),
                                platform: 'weapp'
                            }
                        });
                        yield ctx.applyPlugins({
                            name: 'build',
                            opts: {
                                config: Object.assign({}, config, { isBuildPlugin: false, isWatch, outputRoot: `${config.outputRoot}`, platform: 'weapp', needClearOutput: false }),
                                platform: 'weapp'
                            }
                        });
                    });
                }
                function buildAlipayPlugin() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield ctx.applyPlugins({
                            name: 'build',
                            opts: {
                                config: Object.assign({}, config, { isWatch, platform: 'alipay' }),
                                platform: 'alipay'
                            }
                        });
                        const pluginJson = path.join(sourcePath, PLUGIN_JSON);
                        const pluginMockJson = path.join(sourcePath, PLUGIN_MOCK_JSON);
                        if (fs.existsSync(pluginJson)) {
                            fs.copyFileSync(pluginJson, path.join(outputPath, PLUGIN_JSON));
                        }
                        if (fs.existsSync(pluginMockJson)) {
                            fs.copyFileSync(pluginMockJson, path.join(outputPath, PLUGIN_MOCK_JSON));
                        }
                    });
                }
                switch (plugin) {
                    case WEAPP:
                        yield buildWxPlugin();
                        break;
                    case ALIPAY:
                        yield buildAlipayPlugin();
                        break;
                    default:
                        console.log(chalk.red('输入插件类型错误，目前只支持 weapp/alipay 插件类型'));
                        break;
                }
            });
        }
    });
};
