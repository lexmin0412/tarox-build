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
const util_1 = require("../../util");
exports.default = (ctx) => {
    ctx.registerPlatform({
        name: 'alipay',
        useConfigName: 'mini',
        fn({ config }) {
            return __awaiter(this, void 0, void 0, function* () {
                const { appPath, nodeModulesPath, outputPath } = ctx.paths;
                const { npm, emptyDirectory } = ctx.helper;
                emptyDirectory(outputPath);
                // 准备 miniRunner 参数
                const miniRunnerOpts = Object.assign({}, config, { nodeModulesPath, buildAdapter: config.platform, isBuildPlugin: false, globalObject: 'my', fileType: {
                        templ: '.axml',
                        style: '.acss',
                        config: '.json',
                        script: '.js'
                    }, isUseComponentBuildPage: false });
                ctx.modifyBuildTempFileContent(({ tempFiles }) => {
                    const replaceKeyMap = {
                        navigationBarTitleText: 'defaultTitle',
                        navigationBarBackgroundColor: 'titleBarColor',
                        enablePullDownRefresh: 'pullRefresh',
                        list: 'items',
                        text: 'name',
                        iconPath: 'icon',
                        selectedIconPath: 'activeIcon',
                        color: 'textColor'
                    };
                    Object.keys(tempFiles).forEach(key => {
                        const item = tempFiles[key];
                        if (item.config) {
                            util_1.recursiveReplaceObjectKeys(item.config, replaceKeyMap);
                        }
                    });
                });
                // build with webpack
                const miniRunner = yield npm.getNpmPkg('@tarojs/mini-runner', appPath);
                yield miniRunner(appPath, miniRunnerOpts);
            });
        }
    });
};
