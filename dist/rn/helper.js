"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const helper_1 = require("@tarojs/helper");
const chalk_1 = require("chalk");
const child_process_1 = require("child_process");
const util_1 = require("../util");
function hasRNDep(appPath) {
    const pkgJson = require(path.join(appPath, 'package.json'));
    return Boolean(pkgJson.dependencies['react-native']);
}
exports.hasRNDep = hasRNDep;
function installDep(path) {
    return new Promise((resolve, reject) => {
        console.log();
        console.log(chalk_1.default.yellow('开始安装依赖~'));
        process.chdir(path);
        let command;
        if (helper_1.shouldUseYarn()) {
            command = 'yarn';
        }
        else if (helper_1.shouldUseCnpm()) {
            command = 'cnpm install';
        }
        else {
            command = 'npm install';
        }
        child_process_1.exec(command, (err, stdout, stderr) => {
            if (err)
                reject();
            else {
                console.log(stdout);
                console.log(stderr);
            }
            resolve();
        });
    });
}
exports.installDep = installDep;
function updatePkgJson(appPath) {
    const version = util_1.getPkgVersion();
    const RNDep = `{
    "@tarojs/components-rn": "^${version}",
    "@tarojs/taro-rn": "^${version}",
    "@tarojs/rn-runner": "^${version}",
    "@tarojs/taro-router-rn": "^${version}",
    "@tarojs/taro-redux-rn": "^${version}",
    "react": "16.8.0",
    "react-native": "0.59.9",
    "redux": "^4.0.0",
    "tslib": "^1.8.0"
  }
  `;
    return new Promise((resolve, reject) => {
        const pkgJson = require(path.join(appPath, 'package.json'));
        // 未安装 RN 依赖,则更新 pkgjson,并重新安装依赖
        if (!hasRNDep(appPath)) {
            pkgJson.dependencies = Object.assign({}, pkgJson.dependencies, JSON.parse(RNDep.replace(/(\r\n|\n|\r|\s+)/gm, '')));
            fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(pkgJson, null, 2));
            helper_1.printLog("generate" /* GENERATE */, 'package.json', path.join(appPath, 'package.json'));
            installDep(appPath).then(() => {
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}
exports.updatePkgJson = updatePkgJson;
