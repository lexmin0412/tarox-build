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
exports.default = (ctx) => {
    ctx.registerPlatform({
        name: 'swan',
        useConfigName: 'mini',
        fn({ config }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { appPath, nodeModulesPath, outputPath } = ctx.paths;
                const { npm, PARSE_AST_TYPE, emptyDirectory } = ctx.helper;
                emptyDirectory(outputPath);
                ctx.generateFrameworkInfo({
                    platform: config.platform
                });
                // 生成 project.swan.json
                ctx.generateProjectConfig({
                    srcConfigName: 'project.swan.json',
                    distConfigName: 'project.swan.json'
                });
                // 准备 miniRunner 参数
                const miniRunnerOpts = Object.assign({}, config, { nodeModulesPath, buildAdapter: config.platform, isBuildPlugin: false, globalObject: 'swan', fileType: {
                        templ: '.swan',
                        style: '.css',
                        config: '.json',
                        script: '.js'
                    }, isUseComponentBuildPage: true });
                // 百度小程序的页面是由 Component 构造的，需要在页面配置中增加 component: true 配置
                ctx.modifyBuildTempFileContent(({ tempFiles }) => {
                    Object.keys(tempFiles).forEach(key => {
                        const item = tempFiles[key];
                        if (item.type === PARSE_AST_TYPE.PAGE) {
                            item.config.component = true;
                        }
                    });
                    return tempFiles;
                });
                // build with webpack
                const miniRunner = yield npm.getNpmPkg('@tarojs/mini-runner', appPath);
                yield miniRunner(appPath, miniRunnerOpts);
            });
        }
    });
};
