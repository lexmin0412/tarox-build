"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const minimist = require("minimist");
const service_1 = require("@tarojs/service");
const build_1 = require("./commands/build");
const init_1 = require("./commands/init");
const create_1 = require("./commands/create");
const config_1 = require("./commands/config");
const info_1 = require("./commands/info");
const doctor_1 = require("./commands/doctor");
const convert_1 = require("./commands/convert");
const update_1 = require("./commands/update");
const customCommand_1 = require("./commands/customCommand");
const util_1 = require("./util");
class CLI {
    constructor(appPath) {
        this.appPath = appPath || process.cwd();
    }
    run() {
        this.parseArgs();
    }
    parseArgs() {
        const args = minimist(process.argv.slice(2), {
            alias: {
                version: ['v'],
                help: ['h']
            },
            boolean: ['version', 'help']
        });
        const _ = args._;
        const command = _[0];
        if (command) {
            const kernel = new service_1.Kernel({
                appPath: this.appPath,
                presets: [
                    path.resolve(__dirname, '.', 'presets', 'index.js')
                ]
            });
            switch (command) {
                case 'build':
                    build_1.default(kernel, {
                        platform: args.type,
                        isWatch: !!args.watch,
                        port: args.port,
                        release: args.release,
                        ui: args.ui,
                        uiIndex: args.uiIndex,
                        page: args.page,
                        component: args.component,
                        plugin: args.plugin,
                        isHelp: args.h
                    });
                    break;
                case 'init':
                    const projectName = _[1];
                    init_1.default(kernel, {
                        appPath: this.appPath,
                        projectName,
                        typescript: args.typescript,
                        templateSource: args['template-source'],
                        clone: !!args.clone,
                        template: args.template,
                        css: args.css,
                        isHelp: args.h
                    });
                    break;
                case 'create':
                    const type = _[1] || 'page';
                    const name = _[2] || args.name;
                    create_1.default(kernel, {
                        appPath: this.appPath,
                        type,
                        name,
                        description: args.description,
                        isHelp: args.h
                    });
                    break;
                case 'config':
                    const cmd = _[1];
                    const key = _[2];
                    const value = _[3];
                    config_1.default(kernel, {
                        cmd,
                        key,
                        value,
                        json: !!args.json,
                        isHelp: args.h
                    });
                    break;
                case 'info':
                    const rn = _[1];
                    info_1.default(kernel, {
                        appPath: this.appPath,
                        rn: !!rn,
                        isHelp: args.h
                    });
                    break;
                case 'doctor':
                    doctor_1.default(kernel, {
                        appPath: this.appPath,
                        isHelp: args.h
                    });
                    break;
                case 'convert':
                    convert_1.default(kernel, {
                        appPath: this.appPath,
                        isHelp: args.h
                    });
                    break;
                case 'update':
                    const updateType = _[1];
                    const version = _[2];
                    update_1.default(kernel, {
                        appPath: this.appPath,
                        updateType,
                        version,
                        isHelp: args.h
                    });
                    break;
                default:
                    customCommand_1.default(command, kernel, args);
                    break;
            }
        }
        else {
            if (args.h) {
                console.log('Usage: taro <command> [options]');
                console.log();
                console.log('Options:');
                console.log('  -v, --version       output the version number');
                console.log('  -h, --help          output usage information');
                console.log();
                console.log('Commands:');
                console.log('  init [projectName]  Init a project with default templete');
                console.log('  config <cmd>        Taro config');
                console.log('  create              Create page for project');
                console.log('  build               Build a project with options');
                console.log('  update              Update packages of taro');
                console.log('  info                Diagnostics Taro env info');
                console.log('  doctor              Diagnose taro project');
                console.log('  help [cmd]          display help for [cmd]');
            }
            else if (args.v) {
                console.log(util_1.getPkgVersion());
            }
        }
    }
}
exports.default = CLI;
