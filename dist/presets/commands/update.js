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
const child_process_1 = require("child_process");
const getLatestVersion = require("latest-version");
const semver = require("semver");
const ora = require("ora");
const util_1 = require("../../util");
exports.default = (ctx) => {
    ctx.registerCommand({
        name: 'update',
        fn() {
            return __awaiter(this, void 0, void 0, function* () {
                const { appPath, configPath } = ctx.paths;
                const { chalk, fs, shouldUseCnpm, shouldUseYarn, PROJECT_CONFIG, UPDATE_PACKAGE_LIST } = ctx.helper;
                const { version, updateType } = ctx.runOpts;
                const pkgPath = path.join(appPath, 'package.json');
                const pkgName = util_1.getPkgItemByKey('name');
                function getTargetVersion() {
                    return __awaiter(this, void 0, void 0, function* () {
                        let targetTaroVersion;
                        // base on current project taro versions, not base on @tarojs/cli verison
                        const currentTaroVersion = require(pkgPath).dependencies['@tarojs/taro'];
                        if (version) {
                            targetTaroVersion = semver.clean(version);
                        }
                        else {
                            // update to current lastest major.x.x
                            try {
                                targetTaroVersion = yield getLatestVersion(pkgName, {
                                    version: semver.major(currentTaroVersion).toString()
                                });
                            }
                            catch (e) {
                                targetTaroVersion = yield getLatestVersion(pkgName);
                            }
                        }
                        if (!semver.valid(targetTaroVersion)) {
                            console.log(chalk.red('命令错误:无效的 version ~'));
                            throw Error('无效的 version!');
                        }
                        return targetTaroVersion;
                    });
                }
                function info() {
                    console.log(chalk.red('命令错误:'));
                    console.log(`${chalk.green('taro update self [version]')} 更新 Taro 开发工具 taro-cli 到指定版本或当前主版本的最新版本`);
                    console.log(`${chalk.green('taro update project [version]')} 更新项目所有 Taro 相关依赖到指定版本或当前主版本的最新版本`);
                }
                function updateSelf() {
                    return __awaiter(this, void 0, void 0, function* () {
                        let command;
                        const targetTaroVersion = yield getTargetVersion();
                        if (shouldUseCnpm()) {
                            command = `cnpm i -g @tarojs/cli@${targetTaroVersion}`;
                        }
                        else {
                            command = `npm i -g @tarojs/cli@${targetTaroVersion}`;
                        }
                        const child = child_process_1.exec(command);
                        const spinner = ora('即将将 Taro 开发工具 taro-cli 更新到最新版本...').start();
                        child.stdout.on('data', function (data) {
                            console.log(data);
                            spinner.stop();
                        });
                        child.stderr.on('data', function (data) {
                            console.log(data);
                            spinner.stop();
                        });
                    });
                }
                function updateProject() {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (!configPath || !fs.existsSync(configPath)) {
                            console.log(chalk.red(`找不到项目配置文件${PROJECT_CONFIG}，请确定当前目录是Taro项目根目录!`));
                            process.exit(1);
                        }
                        const packageMap = require(pkgPath);
                        const version = yield getTargetVersion();
                        // 获取 NervJS 版本
                        const nervJSVersion = `^${yield getLatestVersion('nervjs')}`;
                        // 更新 @tarojs/* 版本和 NervJS 版本
                        Object.keys(packageMap.dependencies).forEach((key) => {
                            if (UPDATE_PACKAGE_LIST.indexOf(key) !== -1) {
                                if (key.includes('nerv')) {
                                    packageMap.dependencies[key] = nervJSVersion;
                                }
                                else if (key.includes('react-native')) {
                                    // delete old version react-native,and will update when run taro build
                                    delete packageMap.dependencies[key];
                                }
                                else {
                                    packageMap.dependencies[key] = version;
                                }
                            }
                        });
                        Object.keys(packageMap.devDependencies).forEach((key) => {
                            if (UPDATE_PACKAGE_LIST.indexOf(key) !== -1) {
                                if (key.includes('nerv')) {
                                    packageMap.devDependencies[key] = nervJSVersion;
                                }
                                else {
                                    packageMap.devDependencies[key] = version;
                                }
                            }
                        });
                        // 写入package.json
                        try {
                            yield fs.writeJson(pkgPath, packageMap, { spaces: '\t' });
                            console.log(chalk.green('更新项目 package.json 成功！'));
                            console.log();
                        }
                        catch (err) {
                            console.error(err);
                        }
                        let command;
                        if (shouldUseYarn()) {
                            command = 'yarn';
                        }
                        else if (shouldUseCnpm()) {
                            command = 'cnpm install';
                        }
                        else {
                            command = 'npm install';
                        }
                        const child = child_process_1.exec(command);
                        const spinner = ora('即将将项目所有 Taro 相关依赖更新到最新版本...').start();
                        child.stdout.on('data', function (data) {
                            spinner.stop();
                            console.log(data);
                        });
                        child.stderr.on('data', function (data) {
                            spinner.stop();
                            console.log(data);
                        });
                    });
                }
                if (!updateType)
                    return info();
                if (updateType === 'self')
                    return updateSelf();
                if (updateType === 'project')
                    return updateProject();
                info();
            });
        }
    });
};
