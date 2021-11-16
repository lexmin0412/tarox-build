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
const child_process_1 = require("child_process");
const helper_1 = require("@tarojs/helper");
const util_1 = require("../util");
const buildWithWebpack_1 = require("./buildWithWebpack");
const helper_2 = require("./helper");
// import { convertToJDReact } from '../jdreact/convert_to_jdreact'
const tcpPortUsed = require('tcp-port-used');
// const TEMP_DIR_NAME = 'rn_temp'
const BUNDLE_DIR_NAME = 'rn_bundle';
const buildType = 'rn';
// 兼容 jdreact
function build(appPath, { watch, type = buildType, envHasBeenSet = false, port = 8081, release }, buildHooks) {
    return __awaiter(this, void 0, void 0, function* () {
        process.env.TARO_ENV = buildType;
        yield util_1.checkCliAndFrameworkVersion(appPath, buildType);
        if (!helper_2.hasRNDep(appPath)) {
            yield helper_2.updatePkgJson(appPath);
        }
        const buildData = buildWithWebpack_1.setBuildData(appPath, type);
        process.env.TARO_ENV = type;
        if (!envHasBeenSet) {
            buildWithWebpack_1.setIsProduction(process.env.NODE_ENV === 'production' || !watch);
        }
        fs.ensureDirSync(buildData.outputDir);
        yield buildWithWebpack_1.buildWithWebpack({
            appPath,
            watch,
            buildHooks
        });
        if (!watch) {
            buildBundle(buildData.outputDir);
            return;
        }
        tcpPortUsed.check(port, '127.0.0.1').then((inUse) => {
            if (inUse) {
                console.log(helper_1.chalk.yellow(`⚠️  端口 ${port} 被占用，启动 Metro Server 失败！`));
                console.log(helper_1.chalk.yellow(`如果 Metro Server 已启动，请确保 Metro Server 监听目录为：${appPath}。`));
                console.log('\n\n');
            }
            else {
                try {
                    startServerInNewWindow({ port, appPath });
                    console.log(helper_1.chalk.green(`启动 Metro Server 成功！监听目录：${appPath}。`));
                    console.log('\n\n');
                }
                catch (e) {
                    console.log(helper_1.chalk.yellow(`🙅 启动 Metro Server 失败，请在${appPath}目录下运行：react-native start 手动启动。`));
                    console.log(helper_1.chalk.red(e));
                    console.log('\n\n');
                }
            }
        }).catch(e => {
            console.log(helper_1.chalk.red(e));
        });
    });
}
exports.build = build;
function buildBundle(outputDir) {
    fs.ensureDirSync(outputDir);
    // process.chdir(outputDir)
    // 通过 jdreact  构建 bundle
    // if (rnConfig.bundleType === 'jdreact') {
    //   console.log()
    //   console.log(chalk.green('生成JDReact 目录：'))
    //   console.log()
    //   convertToJDReact({
    //     tempPath: this.tempPath, entryBaseName: this.entryBaseName
    //   })
    //   return
    // }
    // 默认打包到 bundle 文件夹
    fs.ensureDirSync(BUNDLE_DIR_NAME);
    child_process_1.execSync(`node ./node_modules/react-native/local-cli/cli.js bundle --entry-file ${outputDir}/index.js --bundle-output ./${BUNDLE_DIR_NAME}/index.bundle --assets-dest ./${BUNDLE_DIR_NAME} --dev false`, { stdio: 'inherit' });
}
/**
 * @description run packager server
 * copy from react-native/local-cli/runAndroid/runAndroid.js
 */
function startServerInNewWindow({ port, appPath }) {
    // set up OS-specific filenames and commands
    const isWindows = /^win/.test(process.platform);
    const scriptFile = isWindows
        ? 'launchPackager.bat'
        : 'launchPackager.command';
    const packagerEnvFilename = isWindows ? '.packager.bat' : '.packager.env';
    const portExportContent = isWindows
        ? `set RCT_METRO_PORT=${port}`
        : `export RCT_METRO_PORT=${port}`;
    // set up the launchpackager.(command|bat) file
    const scriptsDir = path.resolve(appPath, './node_modules', 'react-native', 'scripts');
    const launchPackagerScript = path.resolve(scriptsDir, scriptFile);
    const procConfig = { cwd: scriptsDir };
    const terminal = process.env.REACT_TERMINAL;
    if (!fs.existsSync(launchPackagerScript)) {
        console.log(helper_1.chalk.red(launchPackagerScript + '不存在，请检查 reatc-naitve 依赖。'));
    }
    // set up the .packager.(env|bat) file to ensure the packager starts on the right port
    const packagerEnvFile = path.join(appPath, 'node_modules', 'react-native', 'scripts', packagerEnvFilename);
    // ensure we overwrite file by passing the 'w' flag
    fs.writeFileSync(packagerEnvFile, portExportContent, {
        encoding: 'utf8',
        flag: 'w'
    });
    if (process.platform === 'darwin') {
        if (terminal) {
            return child_process_1.spawnSync('open', ['-a', terminal, launchPackagerScript], procConfig);
        }
        return child_process_1.spawnSync('open', [launchPackagerScript], procConfig);
    }
    else if (process.platform === 'linux') {
        if (terminal) {
            return child_process_1.spawn(terminal, ['-e', 'sh ' + launchPackagerScript], procConfig);
        }
        return child_process_1.spawn('sh', [launchPackagerScript], procConfig);
    }
    else if (/^win/.test(process.platform)) {
        procConfig.stdio = 'ignore';
        return child_process_1.spawn('cmd.exe', ['/C', launchPackagerScript], procConfig);
    }
    else {
        console.log(helper_1.chalk.red(`Cannot start the packager. Unknown platform ${process.platform}`));
    }
}
