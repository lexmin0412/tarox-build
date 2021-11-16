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
const helper_1 = require("@tarojs/helper");
function getRootPath() {
    return path.resolve(__dirname, '../../');
}
exports.getRootPath = getRootPath;
function getPkgVersion() {
    return require(path.join(getRootPath(), 'package.json')).version;
}
exports.getPkgVersion = getPkgVersion;
function getPkgItemByKey(key) {
    const packageMap = require(path.join(getRootPath(), 'package.json'));
    if (Object.keys(packageMap).indexOf(key) === -1) {
        return {};
    }
    else {
        return packageMap[key];
    }
}
exports.getPkgItemByKey = getPkgItemByKey;
function printPkgVersion() {
    const taroVersion = getPkgVersion();
    console.log(`👽 Taro v${taroVersion}`);
    console.log();
}
exports.printPkgVersion = printPkgVersion;
function checkCliAndFrameworkVersion(appPath, buildAdapter) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkgVersion = getPkgVersion();
        const frameworkName = `@tarojs/taro-${buildAdapter}`;
        const nodeModulesPath = helper_1.recursiveFindNodeModules(path.join(appPath, helper_1.NODE_MODULES));
        const frameworkVersion = helper_1.getInstalledNpmPkgVersion(frameworkName, nodeModulesPath);
        if (frameworkVersion) {
            if (frameworkVersion !== pkgVersion) {
                const taroCliPath = path.join(getRootPath(), 'package.json');
                const frameworkPath = path.join(nodeModulesPath, frameworkName, 'package.json');
                helper_1.printLog("error" /* ERROR */, '版本问题', `Taro CLI 与本地安装运行时框架 ${frameworkName} 版本不一致, 请确保版本一致！`);
                helper_1.printLog("remind" /* REMIND */, '升级命令', `升级到最新CLI：taro update self   升级到最新依赖库：taro update project`);
                helper_1.printLog("remind" /* REMIND */, '升级文档', `请参考 "常用 CLI 命令"中"更新" 章节：https://taro-docs.jd.com/taro/docs/GETTING-STARTED.html`);
                console.log(``);
                console.log(`Taro CLI：${getPkgVersion()}             路径：${taroCliPath}`);
                console.log(`${frameworkName}：${frameworkVersion}   路径：${frameworkPath}`);
                console.log(``);
                process.exit(1);
            }
        }
        else {
            helper_1.printLog("warning" /* WARNING */, '依赖安装', helper_1.chalk.red(`项目依赖 ${frameworkName} 未安装，或安装有误，请重新安装此依赖！`));
            process.exit(1);
        }
    });
}
exports.checkCliAndFrameworkVersion = checkCliAndFrameworkVersion;
exports.getAllFilesInFloder = (floder, filter = []) => __awaiter(this, void 0, void 0, function* () {
    let files = [];
    const list = readDirWithFileTypes(floder);
    yield Promise.all(list.map((item) => __awaiter(this, void 0, void 0, function* () {
        const itemPath = path.join(floder, item.name);
        if (item.isDirectory) {
            const _files = yield exports.getAllFilesInFloder(itemPath, filter);
            files = [...files, ..._files];
        }
        else if (item.isFile) {
            if (!filter.find(rule => rule === item.name))
                files.push(itemPath);
        }
    })));
    return files;
});
function getTemplateSourceType(url) {
    if (/^github:/.test(url) || /^gitlab:/.test(url) || /^direct:/.test(url)) {
        return 'git';
    }
    else {
        return 'url';
    }
}
exports.getTemplateSourceType = getTemplateSourceType;
function readDirWithFileTypes(floder) {
    const list = fs.readdirSync(floder);
    const res = list.map(name => {
        const stat = fs.statSync(path.join(floder, name));
        return {
            name,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile()
        };
    });
    return res;
}
exports.readDirWithFileTypes = readDirWithFileTypes;
function printVersionTip() {
    const taroPath = helper_1.getTaroPath();
    let remindVersion = { remindTimes: 0 };
    const remindVersionFilePath = path.join(taroPath, '.remind_version.json');
    if (!fs.existsSync(remindVersionFilePath)) {
        fs.ensureDirSync(taroPath);
        fs.writeFileSync(remindVersionFilePath, JSON.stringify(remindVersion));
    }
    else {
        remindVersion = fs.readJSONSync(remindVersionFilePath);
    }
    if (remindVersion.remindTimes < 5) {
        console.log(helper_1.chalk.red('当前您正在使用 Taro 2.0 版本，请先执行 taro doctor 确保编译配置正确'));
        console.log(helper_1.chalk.red('如出现令你束手无策的问题，请使用 taro update 命令更新到你指定的稳定版本'));
        remindVersion.remindTimes++;
        fs.writeFileSync(remindVersionFilePath, JSON.stringify(remindVersion));
    }
}
exports.printVersionTip = printVersionTip;
function recursiveReplaceObjectKeys(obj, keyMap) {
    Object.keys(obj).forEach(key => {
        if (keyMap[key]) {
            obj[keyMap[key]] = obj[key];
            if (typeof obj[key] === 'object') {
                recursiveReplaceObjectKeys(obj[keyMap[key]], keyMap);
            }
            delete obj[key];
        }
        else if (keyMap[key] === false) {
            delete obj[key];
        }
        else if (typeof obj[key] === 'object') {
            recursiveReplaceObjectKeys(obj[key], keyMap);
        }
    });
}
exports.recursiveReplaceObjectKeys = recursiveReplaceObjectKeys;
