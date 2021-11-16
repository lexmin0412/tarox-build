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
const _ = require("lodash");
const helper_1 = require("@tarojs/helper");
const config_1 = require("../config");
let BuildData;
function buildWithWebpack({ appPath, watch, buildHooks }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { entryFilePath, buildAdapter, projectConfig, isProduction, alias, sourceDirName, outputDirName, nodeModulesPath } = getBuildData();
        const rnRunner = yield helper_1.npm.getNpmPkg('@tarojs/rn-runner', appPath);
        const babelConfig = helper_1.getBabelConfig(projectConfig.babel);
        const rnRunnerOpts = Object.assign({ entry: {
                app: [entryFilePath]
            }, alias, copy: projectConfig.copy, sourceRoot: sourceDirName, outputRoot: outputDirName, buildAdapter, babel: babelConfig, csso: projectConfig.csso, sass: projectConfig.sass, uglify: projectConfig.uglify, plugins: projectConfig.plugins, projectName: projectConfig.projectName, isWatch: watch, mode: isProduction ? 'production' : 'development', env: projectConfig.env, defineConstants: projectConfig.defineConstants, designWidth: projectConfig.designWidth, deviceRatio: projectConfig.deviceRatio, nodeModulesPath }, projectConfig.rn, buildHooks);
        // console.log('rnRunnerOpts', rnRunnerOpts)
        yield rnRunner(appPath, rnRunnerOpts);
    });
}
exports.buildWithWebpack = buildWithWebpack;
function setIsProduction(isProduction) {
    BuildData.isProduction = isProduction;
}
exports.setIsProduction = setIsProduction;
function setBuildData(appPath, adapter, options) {
    const configDir = helper_1.resolveScriptPath(path.join(appPath, helper_1.PROJECT_CONFIG), 'rn');
    const projectConfig = require(configDir)(_.merge);
    const rnConf = projectConfig.rn || {};
    const sourceDirName = projectConfig.sourceRoot || config_1.default.SOURCE_DIR;
    const outputDirName = rnConf.outputRoot || config_1.default.RN_OUTPUT_DIR;
    const sourceDir = path.join(appPath, sourceDirName);
    const outputDir = path.join(appPath, outputDirName);
    const entryFilePath = helper_1.resolveScriptPath(path.join(sourceDir, config_1.default.ENTRY), 'rn');
    const entryFileName = path.basename(entryFilePath);
    const pathAlias = projectConfig.alias || {};
    const npmConfig = Object.assign({
        name: config_1.default.NPM_DIR,
        dir: null
    }, rnConf.npm);
    BuildData = {
        appPath,
        configDir,
        sourceDirName,
        outputDirName,
        sourceDir,
        outputDir,
        originalOutputDir: outputDir,
        entryFilePath,
        entryFileName,
        projectConfig,
        npmConfig,
        alias: pathAlias,
        isProduction: false,
        buildAdapter: adapter,
        nodeModulesPath: helper_1.recursiveFindNodeModules(path.join(appPath, helper_1.NODE_MODULES))
    };
    if (options) {
        Object.assign(BuildData, options);
    }
    return BuildData;
}
exports.setBuildData = setBuildData;
function getBuildData() {
    return BuildData;
}
exports.getBuildData = getBuildData;
