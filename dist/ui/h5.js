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
const fs = require("fs-extra");
const path = require("path");
const wxTransformer = require("@tarojs/transformer-wx");
const helper_1 = require("@tarojs/helper");
const h5_1 = require("../h5");
const common_1 = require("./common");
function buildForH5(uiIndex = 'index', buildData, buildHooks) {
    return __awaiter(this, void 0, void 0, function* () {
        const { appPath } = buildData;
        const compiler = new h5_1.Compiler(appPath, uiIndex, true);
        console.log();
        console.log(helper_1.chalk.green('开始编译 H5 端组件库！'));
        yield compiler.buildTemp();
        if (process.env.TARO_BUILD_TYPE === 'script') {
            yield buildH5Script(buildData, buildHooks);
        }
        else {
            yield buildH5Lib(uiIndex, buildData);
        }
    });
}
exports.buildForH5 = buildForH5;
function buildH5Script(buildData, buildHooks) {
    return __awaiter(this, void 0, void 0, function* () {
        const { appPath, projectConfig, entryFileName, sourceDirName, tempPath } = buildData;
        const h5Config = Object.assign({}, projectConfig.h5, buildHooks);
        const entryFile = path.basename(entryFileName, path.extname(entryFileName)) + '.js';
        h5Config.isWatch = false;
        helper_1.recursiveMerge(h5Config, {
            env: projectConfig.env,
            defineConstants: projectConfig.defineConstants,
            plugins: projectConfig.plugins,
            babel: projectConfig.babel,
            csso: projectConfig.csso,
            uglify: projectConfig.uglify,
            sass: projectConfig.sass,
            designWidth: projectConfig.designWidth,
            sourceRoot: sourceDirName,
            outputRoot: `${buildData.outputDirName}/${common_1.H5_OUTPUT_NAME}`,
            entry: Object.assign({
                app: [path.join(tempPath, entryFile)]
            }, h5Config.entry),
            isWatch: false
        });
        if (projectConfig.deviceRatio) {
            h5Config.deviceRatio = projectConfig.deviceRatio;
        }
        const webpackRunner = yield helper_1.npm.getNpmPkg('@tarojs/webpack-runner', appPath);
        webpackRunner(appPath, h5Config);
    });
}
exports.buildH5Script = buildH5Script;
function buildH5Lib(uiIndex, buildData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { sourceDir, appPath, outputDirName, tempPath } = buildData;
            const outputDir = path.join(appPath, outputDirName, common_1.H5_OUTPUT_NAME);
            const tempEntryFilePath = helper_1.resolveScriptPath(path.join(tempPath, uiIndex));
            const outputEntryFilePath = path.join(outputDir, path.basename(tempEntryFilePath));
            const code = fs.readFileSync(tempEntryFilePath).toString();
            const transformResult = wxTransformer({
                code,
                sourcePath: tempEntryFilePath,
                isNormal: true,
                isTyped: helper_1.REG_TYPESCRIPT.test(tempEntryFilePath)
            });
            const { styleFiles, components, code: generateCode } = common_1.parseEntryAst(transformResult.ast, tempEntryFilePath);
            const relativePath = path.relative(appPath, tempEntryFilePath);
            helper_1.printLog("copy" /* COPY */, '发现文件', relativePath);
            fs.ensureDirSync(path.dirname(outputEntryFilePath));
            fs.writeFileSync(outputEntryFilePath, generateCode);
            if (components.length) {
                components.forEach(item => {
                    common_1.copyFileToDist(item.path, tempPath, outputDir, buildData);
                });
                common_1.analyzeFiles(components.map(item => item.path), tempPath, outputDir, buildData);
            }
            if (styleFiles.length) {
                styleFiles.forEach(item => {
                    common_1.copyFileToDist(item, tempPath, path.join(appPath, outputDirName), buildData);
                });
                common_1.analyzeStyleFilesImport(styleFiles, tempPath, path.join(appPath, outputDirName), buildData);
            }
            common_1.copyAllInterfaceFiles(sourceDir, outputDir, buildData);
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.buildH5Lib = buildH5Lib;
