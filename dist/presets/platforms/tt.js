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
exports.default = (ctx, opts) => {
    ctx.registerPlatform({
        name: 'tt',
        useConfigName: 'mini',
        fn({ config }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { appPath, nodeModulesPath, outputPath } = ctx.paths;
                const { npm, emptyDirectory } = ctx.helper;
                emptyDirectory(outputPath);
                // 生成 project.config.json
                ctx.generateProjectConfig({
                    srcConfigName: 'project.tt.json',
                    distConfigName: 'project.config.json'
                });
                // 准备 miniRunner 参数
                const miniRunnerOpts = Object.assign({}, config, { nodeModulesPath, buildAdapter: config.platform, isBuildPlugin: false, globalObject: 'tt', fileType: {
                        templ: '.ttml',
                        style: '.ttss',
                        config: '.json',
                        script: '.js'
                    }, isUseComponentBuildPage: false });
                // build with webpack
                const miniRunner = yield npm.getNpmPkg('@tarojs/mini-runner', appPath);
                yield miniRunner(appPath, miniRunnerOpts);
            });
        }
    });
};
