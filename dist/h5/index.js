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
const transformer_wx_1 = require("@tarojs/transformer-wx");
const babel = require("babel-core");
const babel_traverse_1 = require("babel-traverse");
const t = require("babel-types");
const better_babel_generator_1 = require("better-babel-generator");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const klaw = require("klaw");
const lodash_1 = require("lodash");
const fp_1 = require("lodash/fp");
const path = require("path");
const resolve = require("resolve");
const config_1 = require("../config");
const helper_1 = require("@tarojs/helper");
const astConvert_1 = require("../util/astConvert");
const util_1 = require("../util");
const constants_1 = require("./constants");
const helper_2 = require("./helper");
const defaultH5Config = {
    router: {
        mode: 'hash',
        customRoutes: {},
        basename: '/'
    }
};
const BLOCK_TAG_NAME = 'Block';
class Compiler {
    constructor(appPath, entryFile, isUi) {
        this.appPath = appPath;
        this.pages = [];
        helper_1.createBabelRegister({
            only: [
                filePath => filePath.indexOf(path.dirname(path.join(appPath, helper_1.PROJECT_CONFIG))) >= 0
            ]
        });
        const projectConfig = helper_1.recursiveMerge({
            h5: defaultH5Config
        }, helper_1.getModuleDefaultExport(require(helper_1.resolveScriptPath(path.join(appPath, helper_1.PROJECT_CONFIG))))(lodash_1.merge));
        this.projectConfig = projectConfig;
        const sourceDir = projectConfig.sourceRoot || config_1.default.SOURCE_DIR;
        this.sourceRoot = sourceDir;
        const outputDir = projectConfig.outputRoot || config_1.default.OUTPUT_DIR;
        this.outputDir = outputDir;
        this.h5Config = lodash_1.get(projectConfig, 'h5');
        this.routerConfig = lodash_1.get(projectConfig, 'h5.router', {});
        this.sourcePath = path.join(appPath, sourceDir);
        this.outputPath = path.join(appPath, outputDir);
        this.tempDir = config_1.default.TEMP_DIR;
        this.tempPath = path.join(appPath, this.tempDir);
        this.entryFilePath = helper_1.resolveScriptPath(path.join(this.sourcePath, entryFile || config_1.default.ENTRY));
        this.entryFileName = path.basename(this.entryFilePath);
        this.pathAlias = projectConfig.alias || {};
        this.pxTransformConfig = { designWidth: projectConfig.designWidth || 750 };
        if (projectConfig.hasOwnProperty(constants_1.deviceRatioConfigName)) {
            this.pxTransformConfig.deviceRatio = projectConfig.deviceRatio;
        }
        this.isUi = !!isUi;
    }
    clean() {
        return __awaiter(this, void 0, void 0, function* () {
            const tempPath = this.tempPath;
            const outputPath = this.outputPath;
            try {
                yield helper_2.pRimraf(tempPath);
                yield helper_2.pRimraf(outputPath);
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    copyFiles() { }
    classifyFiles(filename) {
        const pages = this.pages;
        const appPath = this.appPath;
        const entryFilePath = this.entryFilePath;
        const relPath = path.normalize(path.relative(appPath, filename));
        if (path.relative(filename, entryFilePath) === '')
            return constants_1.FILE_TYPE.ENTRY;
        let relSrcPath = path.relative(this.sourceRoot, relPath);
        relSrcPath = path.format({
            dir: path.dirname(relSrcPath),
            base: path.basename(relSrcPath, path.extname(relSrcPath))
        });
        const isPage = pages.some(([pageName, filePath]) => {
            const relPage = path.normalize(path.relative(appPath, pageName));
            if (path.relative(relPage, relSrcPath) === '')
                return true;
            return false;
        });
        if (isPage) {
            return constants_1.FILE_TYPE.PAGE;
        }
        else {
            return constants_1.FILE_TYPE.NORMAL;
        }
    }
    buildTemp() {
        const tempPath = this.tempPath;
        const sourcePath = this.sourcePath;
        const appPath = this.appPath;
        fs.ensureDirSync(tempPath);
        const readPromises = [];
        function readFiles(sourcePath, originalFilePath) {
            readPromises.push(new Promise((resolve, reject) => {
                klaw(sourcePath)
                    .on('data', (file) => __awaiter(this, void 0, void 0, function* () {
                    const REG_IGNORE = /(\\|\/)\.(svn|git)\1/i;
                    const relativePath = path.relative(appPath, file.path);
                    if (file.stats.isSymbolicLink()) {
                        let linkFile = fs.readlinkSync(file.path);
                        if (!path.isAbsolute(linkFile)) {
                            linkFile = path.resolve(file.path, '..', linkFile);
                        }
                        readFiles.call(this, linkFile, file.path);
                    }
                    else if (!file.stats.isDirectory() && !REG_IGNORE.test(relativePath)) {
                        helper_1.printLog("create" /* CREATE */, '发现文件', relativePath);
                        yield this.processFiles(file.path, originalFilePath);
                    }
                }))
                    .on('end', () => {
                    resolve();
                });
            }));
        }
        readFiles.call(this, sourcePath, sourcePath);
        return Promise.all(readPromises);
    }
    buildDist({ watch, port }, { modifyWebpackChain, modifyBuildAssets, onBuildFinish }) {
        return __awaiter(this, void 0, void 0, function* () {
            const isMultiRouterMode = lodash_1.get(this.h5Config, 'router.mode') === 'multi';
            const entryFileName = this.entryFileName;
            const projectConfig = this.projectConfig;
            /** 不是真正意义上的IH5Config对象 */
            const h5Config = this.h5Config;
            const outputDir = this.outputDir;
            const sourceRoot = this.sourceRoot;
            const tempPath = this.tempPath;
            const pathAlias = this.pathAlias;
            const getEntryFile = (filename) => {
                return path.join(tempPath, filename);
            };
            const entryFile = path.basename(entryFileName, path.extname(entryFileName)) + '.js';
            const defaultEntry = isMultiRouterMode
                ? lodash_1.fromPairs(this.pages.map(([pagename, filePath]) => {
                    return [filePath, [getEntryFile(filePath) + '.js']];
                }))
                : {
                    app: [getEntryFile(entryFile)]
                };
            if (projectConfig.deviceRatio) {
                h5Config.deviceRatio = projectConfig.deviceRatio;
            }
            if (projectConfig.env) {
                h5Config.env = projectConfig.env;
            }
            helper_1.recursiveMerge(h5Config, {
                alias: pathAlias,
                copy: projectConfig.copy,
                homePage: lodash_1.first(this.pages),
                defineConstants: projectConfig.defineConstants,
                designWidth: projectConfig.designWidth,
                entry: lodash_1.merge(defaultEntry, h5Config.entry),
                env: {
                    TARO_ENV: JSON.stringify('h5')
                },
                isWatch: !!watch,
                outputRoot: outputDir,
                babel: projectConfig.babel,
                csso: projectConfig.csso,
                uglify: projectConfig.uglify,
                sass: projectConfig.sass,
                plugins: projectConfig.plugins,
                port,
                sourceRoot,
                modifyWebpackChain,
                modifyBuildAssets,
                onBuildFinish
            });
            const webpackRunner = yield helper_1.npm.getNpmPkg('@tarojs/webpack-runner', this.appPath);
            webpackRunner(this.appPath, h5Config);
        });
    }
    watchFiles() {
        const sourcePath = this.sourcePath;
        const appPath = this.appPath;
        const watcher = chokidar.watch(path.join(sourcePath), {
            ignored: /(^|[/\\])\../,
            persistent: true,
            ignoreInitial: true
        });
        watcher
            .on('add', (filePath) => __awaiter(this, void 0, void 0, function* () {
            const relativePath = path.relative(appPath, filePath);
            helper_1.printLog("create" /* CREATE */, '添加文件', relativePath);
            yield this.processFiles(filePath, filePath);
        }))
            .on('change', (filePath) => __awaiter(this, void 0, void 0, function* () {
            const relativePath = path.relative(appPath, filePath);
            helper_1.printLog("modify" /* MODIFY */, '文件变动', relativePath);
            yield this.processFiles(filePath, filePath);
        }))
            .on('unlink', filePath => {
            const relativePath = path.relative(appPath, filePath);
            const extname = path.extname(relativePath);
            const distDirname = this.getTempDir(filePath, filePath);
            const isScriptFile = helper_1.REG_SCRIPTS.test(extname);
            const dist = this.getDist(distDirname, filePath, isScriptFile);
            helper_1.printLog("unlink" /* UNLINK */, '删除文件', relativePath);
            fs.unlinkSync(dist);
        });
    }
    processEntry(code, filePath) {
        const pages = this.pages;
        const pathAlias = this.pathAlias;
        const pxTransformConfig = this.pxTransformConfig;
        const routerMode = this.routerConfig.mode;
        const isMultiRouterMode = routerMode === 'multi';
        const routerLazyload = 'lazyload' in this.routerConfig
            ? this.routerConfig.lazyload
            : !isMultiRouterMode;
        const customRoutes = isMultiRouterMode
            ? {}
            : lodash_1.get(this.h5Config, 'router.customRoutes', {});
        const routerBasename = isMultiRouterMode
            ? lodash_1.get(this.h5Config, 'publicPath', '/')
            : helper_2.addLeadingSlash(helper_2.stripTrailingSlash(lodash_1.get(this.h5Config, 'router.basename')));
        const renamePagename = lodash_1.get(this.h5Config, 'router.renamePagename', lodash_1.identity);
        const isUi = this.isUi;
        let ast = transformer_wx_1.default({
            code,
            sourcePath: filePath,
            isNormal: true,
            isTyped: helper_1.REG_TYPESCRIPT.test(filePath),
            adapter: 'h5'
        }).ast;
        let taroImportDefaultName;
        let providerImportName;
        let storeName;
        let renderCallCode;
        let tabBar;
        let tabbarPos;
        let hasConstructor = false;
        let hasComponentWillMount = false;
        let hasComponentDidMount = false;
        let hasComponentDidShow = false;
        let hasComponentDidHide = false;
        let hasComponentWillUnmount = false;
        let hasNerv = false;
        let stateNode;
        const additionalConstructorNode = astConvert_1.convertSourceStringToAstExpression(`Taro._$app = this`);
        const callComponentDidShowNode = astConvert_1.convertSourceStringToAstExpression(`this.componentDidShow()`);
        const callComponentDidHideNode = astConvert_1.convertSourceStringToAstExpression(`this.componentDidHide()`);
        const initTabbarApiNode = astConvert_1.convertSourceStringToAstExpression(`Taro.initTabBarApis(this, Taro)`);
        ast = babel.transformFromAst(ast, '', {
            plugins: [
                [require('babel-plugin-preval')],
                [require('babel-plugin-danger-remove-unused-import'), { ignore: ['@tarojs/taro', 'react', 'nervjs'] }],
                [require('babel-plugin-transform-taroapi').default, {
                        apis: require(resolve.sync('@tarojs/taro-h5/dist/taroApis', { basedir: this.appPath })),
                        packageName: '@tarojs/taro-h5'
                    }]
            ]
        }).ast;
        const ClassDeclarationOrExpression = {
            enter(astPath) {
                const node = astPath.node;
                if (!node.superClass)
                    return;
                if (helper_2.isTaroClass(astPath)) {
                    helper_2.resetTSClassProperty(node.body.body);
                }
            }
        };
        const wrapWithTabbar = (currentPagename, funcBody) => {
            const firstPage = lodash_1.first(pages);
            const homePage = firstPage ? firstPage[0] : '';
            const panel = `
        <${constants_1.tabBarPanelComponentName}>
          ${funcBody}
        </${constants_1.tabBarPanelComponentName}>`;
            const comp = `
        <${constants_1.tabBarComponentName}
          conf={this.state.${constants_1.tabBarConfigName}}
          homePage="${homePage}"
          ${currentPagename ? `currentPagename={'${currentPagename}'}` : ''}
          ${tabbarPos === 'top' ? `tabbarPos={'top'}` : ''} />`;
            return `
        <${constants_1.tabBarContainerComponentName}>
          ${tabbarPos === 'top' ? `${comp}${panel}` : `${panel}${comp}`}
        </${constants_1.tabBarContainerComponentName}>`;
        };
        const wrapWithProvider = (funcBody) => {
            return `
        <${providerImportName} store={${storeName}}>
          ${funcBody}
        </${providerImportName}>
      `;
        };
        const wrapWithFuncBody = (funcBody) => {
            return `{return (${funcBody});}`;
        };
        /**
         * ProgramExit使用的visitor
         * 负责修改render函数的内容，在componentDidMount中增加componentDidShow调用，在componentWillUnmount中增加componentDidHide调用。
         */
        const programExitVisitor = {
            ClassMethod: {
                exit(astPath) {
                    if (isMultiRouterMode)
                        return;
                    const node = astPath.node;
                    const key = node.key;
                    const keyName = astConvert_1.convertAstExpressionToVariable(key);
                    const isRender = keyName === 'render';
                    const isComponentWillMount = keyName === 'componentWillMount';
                    const isComponentDidMount = keyName === 'componentDidMount';
                    const isComponentWillUnmount = keyName === 'componentWillUnmount';
                    const isConstructor = keyName === 'constructor';
                    if (isRender) {
                        const createFuncBody = (pages) => {
                            const routes = pages.map(([pageName, filePath], k) => {
                                const shouldLazyloadPage = typeof routerLazyload === 'function'
                                    ? routerLazyload(pageName)
                                    : routerLazyload;
                                return helper_2.createRoute({
                                    pageName,
                                    lazyload: shouldLazyloadPage,
                                    isIndex: k === 0
                                });
                            });
                            return `
                <Router
                  mode={${JSON.stringify(routerMode)}}
                  history={_taroHistory}
                  routes={[${routes.join(',')}]}
                  ${tabBar ? `tabBar={this.state.${constants_1.tabBarConfigName}}` : ''}
                  customRoutes={${JSON.stringify(customRoutes)}} />
                `;
                        };
                        const buildFuncBody = fp_1.pipe(...lodash_1.compact([
                            createFuncBody,
                            tabBar && fp_1.partial(wrapWithTabbar, ['']),
                            constants_1.providerComponentName && storeName && wrapWithProvider,
                            wrapWithFuncBody
                        ]));
                        node.body = astConvert_1.convertSourceStringToAstExpression(buildFuncBody(pages), { preserveComments: true });
                    }
                    else {
                        node.body.body = lodash_1.compact([
                            hasComponentDidHide && isComponentWillUnmount && callComponentDidHideNode,
                            ...node.body.body,
                            tabBar && isComponentWillMount && initTabbarApiNode,
                            hasConstructor && isConstructor && additionalConstructorNode,
                            hasComponentDidShow && isComponentDidMount && callComponentDidShowNode
                        ]);
                    }
                }
            },
            ClassBody: {
                exit(astPath) {
                    const node = astPath.node;
                    if (hasComponentDidShow && !hasComponentDidMount) {
                        node.body.push(t.classMethod('method', t.identifier('componentDidMount'), [], t.blockStatement([callComponentDidShowNode]), false, false));
                    }
                    if (hasComponentDidHide && !hasComponentWillUnmount) {
                        node.body.push(t.classMethod('method', t.identifier('componentWillUnmount'), [], t.blockStatement([callComponentDidHideNode]), false, false));
                    }
                    if (!hasConstructor) {
                        node.body.push(t.classMethod('method', t.identifier('constructor'), [t.identifier('props'), t.identifier('context')], t.blockStatement([astConvert_1.convertSourceStringToAstExpression('super(props, context)'), additionalConstructorNode]), false, false));
                    }
                    if (tabBar) {
                        if (!hasComponentWillMount) {
                            node.body.push(t.classMethod('method', t.identifier('componentWillMount'), [], t.blockStatement([initTabbarApiNode]), false, false));
                        }
                        if (!stateNode) {
                            stateNode = t.classProperty(t.identifier('state'), t.objectExpression([]));
                            node.body.unshift(stateNode);
                        }
                        if (t.isObjectExpression(stateNode.value)) {
                            stateNode.value.properties.push(t.objectProperty(t.identifier(constants_1.tabBarConfigName), tabBar));
                        }
                    }
                }
            }
        };
        /**
         * ClassProperty使用的visitor
         * 负责收集config中的pages，收集tabbar的position，替换icon。
         */
        const classPropertyVisitor = {
            ObjectProperty(astPath) {
                const node = astPath.node;
                const key = node.key;
                const value = node.value;
                const keyName = astConvert_1.convertAstExpressionToVariable(key);
                if (keyName === 'pages' && t.isArrayExpression(value)) {
                    const subPackageParent = astPath.findParent(helper_2.isUnderSubPackages);
                    if (subPackageParent) {
                        /* 在subPackages属性下，说明是分包页面，需要处理root属性 */
                        const parent = astPath.parent;
                        const rootNode = parent.properties.find(v => {
                            if (t.isSpreadProperty(v))
                                return false;
                            return astConvert_1.convertAstExpressionToVariable(v.key) === 'root';
                        });
                        const root = rootNode ? astConvert_1.convertAstExpressionToVariable(rootNode.value) : '';
                        value.elements.forEach((v) => {
                            const pagePath = `${root}/${v.value}`.replace(/\/{2,}/g, '/');
                            const pageName = helper_2.removeLeadingSlash(pagePath);
                            pages.push([pageName, renamePagename(pageName).replace(/\//g, '')]);
                            v.value = helper_2.addLeadingSlash(v.value);
                        });
                    }
                    else {
                        value.elements.forEach((v) => {
                            const pagePath = v.value.replace(/\/{2,}/g, '/');
                            const pageName = helper_2.removeLeadingSlash(pagePath);
                            pages.push([pageName, renamePagename(pageName).replace(/\//g, '')]);
                            v.value = helper_2.addLeadingSlash(v.value);
                        });
                    }
                }
                else if (keyName === 'tabBar' && t.isObjectExpression(value)) {
                    // tabBar相关处理
                    tabBar = value;
                    value.properties.forEach((node) => {
                        if (t.isSpreadProperty(node))
                            return;
                        switch (astConvert_1.convertAstExpressionToVariable(node.key)) {
                            case 'position':
                                tabbarPos = astConvert_1.convertAstExpressionToVariable(node.value);
                                break;
                            case 'list':
                                t.isArrayExpression(node.value) && node.value.elements.forEach(v => {
                                    if (!t.isObjectExpression(v))
                                        return;
                                    v.properties.forEach(property => {
                                        if (!t.isObjectProperty(property))
                                            return;
                                        switch (astConvert_1.convertAstExpressionToVariable(property.key)) {
                                            case 'iconPath':
                                            case 'selectedIconPath':
                                                if (t.isStringLiteral(property.value)) {
                                                    property.value = t.callExpression(t.identifier('require'), [t.stringLiteral(`./${property.value.value}`)]);
                                                }
                                                break;
                                            case 'pagePath':
                                                property.value = t.stringLiteral(helper_2.addLeadingSlash(astConvert_1.convertAstExpressionToVariable(property.value)));
                                                break;
                                        }
                                    });
                                });
                        }
                    });
                    value.properties.push(t.objectProperty(t.identifier('mode'), t.stringLiteral(routerMode)));
                    value.properties.push(t.objectProperty(t.identifier('basename'), t.stringLiteral(routerBasename)));
                    value.properties.push(t.objectProperty(t.identifier('customRoutes'), t.objectExpression(astConvert_1.convertObjectToAstExpression(customRoutes))));
                }
            }
        };
        babel_traverse_1.default(ast, {
            ClassExpression: ClassDeclarationOrExpression,
            ClassDeclaration: ClassDeclarationOrExpression,
            ClassProperty: {
                enter(astPath) {
                    const node = astPath.node;
                    const key = node.key;
                    const keyName = astConvert_1.convertAstExpressionToVariable(key);
                    if (keyName === 'state') {
                        stateNode = node;
                    }
                    else if (keyName === 'config') {
                        astPath.traverse(classPropertyVisitor);
                        if (isMultiRouterMode) {
                            lodash_1.merge(customRoutes, lodash_1.transform(pages, (res, [pageName, filePath], key) => {
                                res[helper_2.addLeadingSlash(pageName)] = helper_2.addLeadingSlash(filePath);
                            }, {}));
                        }
                    }
                }
            },
            ImportDeclaration: {
                enter: (astPath) => {
                    const node = astPath.node;
                    const source = node.source;
                    const specifiers = node.specifiers;
                    if (source.value === '@tarojs/taro') {
                        const specifier = specifiers.find(item => t.isImportDefaultSpecifier(item));
                        if (specifier) {
                            taroImportDefaultName = astConvert_1.convertAstExpressionToVariable(specifier.local);
                        }
                        source.value = '@tarojs/taro-h5';
                    }
                    else if (source.value === '@tarojs/redux') {
                        const specifier = specifiers.find(item => {
                            return t.isImportSpecifier(item) && item.imported.name === constants_1.providerComponentName;
                        });
                        if (specifier) {
                            providerImportName = specifier.local.name;
                        }
                        else {
                            providerImportName = constants_1.providerComponentName;
                            specifiers.push(t.importSpecifier(t.identifier(constants_1.providerComponentName), t.identifier(constants_1.providerComponentName)));
                        }
                        source.value = '@tarojs/redux-h5';
                    }
                    else if (source.value === '@tarojs/mobx') {
                        const specifier = specifiers.find(item => {
                            return t.isImportSpecifier(item) && item.imported.name === constants_1.providerComponentName;
                        });
                        if (specifier) {
                            providerImportName = specifier.local.name;
                        }
                        else {
                            providerImportName = constants_1.providerComponentName;
                            specifiers.push(t.importSpecifier(t.identifier(constants_1.providerComponentName), t.identifier(constants_1.providerComponentName)));
                        }
                        source.value = '@tarojs/mobx-h5';
                    }
                    else if (source.value === 'nervjs') {
                        hasNerv = true;
                        const defaultSpecifier = specifiers.find(item => t.isImportDefaultSpecifier(item));
                        if (!defaultSpecifier) {
                            specifiers.unshift(t.importDefaultSpecifier(t.identifier(constants_1.nervJsImportDefaultName)));
                        }
                    }
                    if (helper_1.isAliasPath(source.value, pathAlias)) {
                        source.value = this.transformToTempDir(helper_1.replaceAliasPath(filePath, source.value, pathAlias));
                    }
                    if (!helper_1.isNpmPkg(source.value)) {
                        if (source.value.indexOf('.') === 0) {
                            const pathArr = source.value.split('/');
                            /* FIXME: 会导致误删除 */
                            if (pathArr.indexOf('pages') >= 0) {
                                astPath.remove();
                            }
                            else if (helper_1.REG_SCRIPTS.test(source.value) || path.extname(source.value) === '') {
                                /* 移除后缀名 */
                                const absolutePath = path.resolve(filePath, '..', source.value);
                                const dirname = path.dirname(absolutePath);
                                const extname = path.extname(absolutePath);
                                const realFilePath = helper_1.resolveScriptPath(path.join(dirname, path.basename(absolutePath, extname)));
                                const removeExtPath = realFilePath.replace(path.extname(realFilePath), '');
                                source.value = helper_1.promoteRelativePath(path.relative(filePath, removeExtPath)).replace(/\\/g, '/');
                            }
                        }
                    }
                }
            },
            CallExpression: {
                enter(astPath) {
                    const node = astPath.node;
                    const callee = node.callee;
                    const calleeName = astConvert_1.convertAstExpressionToVariable(callee);
                    const parentPath = astPath.parentPath;
                    const arg0 = node.arguments[0];
                    if (calleeName === 'require' && t.isStringLiteral(arg0)) {
                        const required = arg0.value;
                        if (required === '@tarojs/taro-h5') {
                            arg0.value = `@tarojs/taro-h5/dist/index.cjs.js`;
                        }
                    }
                    else if (t.isMemberExpression(callee)) {
                        const object = callee.object;
                        const property = callee.property;
                        if (object.name === taroImportDefaultName && property.name === 'render') {
                            object.name = constants_1.nervJsImportDefaultName;
                            renderCallCode = better_babel_generator_1.default(astPath.node).code;
                            astPath.remove();
                        }
                    }
                    else {
                        if (calleeName === constants_1.setStoreFuncName) {
                            if (parentPath.isAssignmentExpression() ||
                                parentPath.isExpressionStatement() ||
                                parentPath.isVariableDeclarator()) {
                                parentPath.remove();
                            }
                        }
                    }
                }
            },
            ClassMethod: {
                exit(astPath) {
                    const node = astPath.node;
                    const key = node.key;
                    const keyName = astConvert_1.convertAstExpressionToVariable(key);
                    if (keyName === 'constructor') {
                        hasConstructor = true;
                    }
                    else if (keyName === 'componentWillMount') {
                        hasComponentWillMount = true;
                    }
                    else if (keyName === 'componentDidMount') {
                        hasComponentDidMount = true;
                    }
                    else if (keyName === 'componentDidShow') {
                        hasComponentDidShow = true;
                    }
                    else if (keyName === 'componentDidHide') {
                        hasComponentDidHide = true;
                    }
                    else if (keyName === 'componentWillUnmount') {
                        hasComponentWillUnmount = true;
                    }
                }
            },
            JSXOpeningElement: {
                enter(astPath) {
                    const node = astPath.node;
                    if (astConvert_1.convertAstExpressionToVariable(node.name) === 'Provider') {
                        for (const v of node.attributes) {
                            if (v.name.name !== 'store')
                                continue;
                            if (!t.isJSXExpressionContainer(v.value))
                                return;
                            storeName = astConvert_1.convertAstExpressionToVariable(v.value.expression);
                            break;
                        }
                    }
                }
            },
            Program: {
                exit(astPath) {
                    const node = astPath.node;
                    const lastImportIndex = lodash_1.findLastIndex(astPath.node.body, t.isImportDeclaration);
                    const lastImportNode = astPath.get(`body.${lastImportIndex > -1 ? lastImportIndex : 0}`);
                    const firstPage = lodash_1.first(pages);
                    const routerConfigs = JSON.stringify({
                        basename: routerBasename,
                        customRoutes
                    });
                    const extraNodes = [
                        !hasNerv && astConvert_1.convertSourceStringToAstExpression(`import ${constants_1.nervJsImportDefaultName} from 'nervjs'`),
                        tabBar && astConvert_1.convertSourceStringToAstExpression(`import { View, ${constants_1.tabBarComponentName}, ${constants_1.tabBarContainerComponentName}, ${constants_1.tabBarPanelComponentName}} from '@tarojs/components'`),
                        astConvert_1.convertSourceStringToAstExpression(`import { Router, createHistory, mountApis } from '@tarojs/router'`),
                        astConvert_1.convertSourceStringToAstExpression(`Taro.initPxTransform(${JSON.stringify(pxTransformConfig)})`),
                        astConvert_1.convertSourceStringToAstExpression(`
              const _taroHistory = createHistory({
                mode: "${routerMode}",
                basename: "${routerBasename}",
                customRoutes: ${JSON.stringify(customRoutes)},
                firstPagePath: "${helper_2.addLeadingSlash(firstPage ? firstPage[0] : '')}"
              });
            `),
                        isMultiRouterMode ? astConvert_1.convertSourceStringToAstExpression(`mountApis(${routerConfigs});`) : astConvert_1.convertSourceStringToAstExpression(`mountApis(${routerConfigs}, _taroHistory);`)
                    ];
                    astPath.traverse(programExitVisitor);
                    if (!isUi) {
                        lastImportNode.insertAfter(lodash_1.compact(extraNodes));
                    }
                    if (renderCallCode) {
                        const renderCallNode = astConvert_1.convertSourceStringToAstExpression(renderCallCode);
                        node.body.push(renderCallNode);
                    }
                }
            }
        });
        const generateCode = (ast) => {
            return better_babel_generator_1.default(ast, {
                jsescOption: {
                    minimal: true
                }
            }).code;
        };
        if (isMultiRouterMode) {
            return this.pages.map(([pageName, filePath], k) => {
                const createFuncBody = () => {
                    const shouldLazyloadPage = typeof routerLazyload === 'function'
                        ? routerLazyload(pageName)
                        : routerLazyload;
                    const route = helper_2.createRoute({
                        pageName,
                        lazyload: shouldLazyloadPage,
                        isIndex: k === 0
                    });
                    return `
            <Router
              mode={${JSON.stringify(routerMode)}}
              history={_taroHistory}
              routes={[${route}]}
              ${tabBar ? `tabBar={this.state.${constants_1.tabBarConfigName}}` : ''}
              customRoutes={${JSON.stringify(customRoutes)}} />
            `;
                };
                const replaceMultiRouterVisitor = {
                    ClassMethod: {
                        exit(astPath) {
                            const node = astPath.node;
                            const key = node.key;
                            const keyName = astConvert_1.convertAstExpressionToVariable(key);
                            const isRender = keyName === 'render';
                            const isComponentWillMount = keyName === 'componentWillMount';
                            const isComponentDidMount = keyName === 'componentDidMount';
                            const isComponentWillUnmount = keyName === 'componentWillUnmount';
                            const isConstructor = keyName === 'constructor';
                            if (isRender) {
                                const buildFuncBody = fp_1.pipe(...lodash_1.compact([
                                    createFuncBody,
                                    tabBar && fp_1.partial(wrapWithTabbar, [helper_2.addLeadingSlash(pageName)]),
                                    constants_1.providerComponentName && storeName && wrapWithProvider,
                                    wrapWithFuncBody
                                ]));
                                node.body = astConvert_1.convertSourceStringToAstExpression(buildFuncBody(pages), { preserveComments: true });
                            }
                            else {
                                node.body.body = lodash_1.compact([
                                    hasComponentDidHide && isComponentWillUnmount && callComponentDidHideNode,
                                    ...node.body.body,
                                    tabBar && isComponentWillMount && initTabbarApiNode,
                                    hasConstructor && isConstructor && additionalConstructorNode,
                                    hasComponentDidShow && isComponentDidMount && callComponentDidShowNode
                                ]);
                            }
                        }
                    },
                    Program: {
                        exit(astPath) {
                            const node = astPath.node;
                            node.body.forEach((bodyNode) => {
                                if (t.isExpressionStatement(bodyNode)
                                    && t.isCallExpression(bodyNode.expression)
                                    && t.isIdentifier(bodyNode.expression.callee)
                                    && bodyNode.expression.callee.name === 'mountApis') {
                                    const mountApisOptNode = bodyNode.expression.arguments[0];
                                    if (t.isObjectExpression(mountApisOptNode)) {
                                        const valueNode = t.stringLiteral(helper_2.addLeadingSlash(pageName));
                                        let basenameNode = mountApisOptNode.properties.find((property) => {
                                            return astConvert_1.convertAstExpressionToVariable(property.key) === 'currentPagename';
                                        });
                                        if (basenameNode) {
                                            basenameNode.value = valueNode;
                                        }
                                        else {
                                            basenameNode = t.objectProperty(t.stringLiteral('currentPagename'), valueNode);
                                            mountApisOptNode.properties.push(basenameNode);
                                        }
                                    }
                                }
                            });
                        }
                    }
                };
                babel_traverse_1.default(ast, replaceMultiRouterVisitor);
                return [filePath, generateCode(ast)];
            });
        }
        else {
            return generateCode(ast);
        }
    }
    processOthers(code, filePath, fileType) {
        const pathAlias = this.pathAlias;
        const componentnameMap = new Map();
        const taroapiMap = new Map();
        const isPage = fileType === constants_1.FILE_TYPE.PAGE;
        let ast = transformer_wx_1.default({
            code,
            sourcePath: filePath,
            isNormal: true,
            isTyped: helper_1.REG_TYPESCRIPT.test(filePath),
            adapter: 'h5'
        }).ast;
        let taroImportDefaultName;
        let hasJSX = false;
        let hasOnPageScroll = false;
        let hasOnReachBottom = false;
        let hasOnPullDownRefresh = false;
        let pageConfig = {};
        let componentDidMountNode;
        let componentDidShowNode;
        let componentDidHideNode;
        let importTaroComponentNode;
        let importNervNode;
        let importTaroNode;
        let renderClassMethodNode;
        let exportDefaultDeclarationNode;
        let exportNamedDeclarationPath;
        let componentClassName;
        let needSetConfigFromHooks;
        let configFromHooks;
        const renderReturnStatementPaths = [];
        ast = babel.transformFromAst(ast, '', {
            plugins: [
                [require('babel-plugin-preval')],
                [require('babel-plugin-danger-remove-unused-import'), { ignore: ['@tarojs/taro', 'react', 'nervjs'] }],
                [require('babel-plugin-transform-taroapi').default, {
                        apis: require(resolve.sync('@tarojs/taro-h5/dist/taroApis', { basedir: this.appPath })),
                        packageName: '@tarojs/taro'
                    }]
            ]
        }).ast;
        const ClassDeclarationOrExpression = {
            enter(astPath) {
                const node = astPath.node;
                if (!node.superClass)
                    return;
                if (helper_2.isTaroClass(astPath)) {
                    helper_2.resetTSClassProperty(node.body.body);
                    if (t.isClassDeclaration(astPath)) {
                        if (node.id === null) {
                            componentClassName = '_TaroComponentClass';
                            astPath.replaceWith(t.classDeclaration(t.identifier(componentClassName), node.superClass, node.body, node.decorators || []));
                        }
                        else {
                            componentClassName = node.id.name;
                        }
                    }
                    else {
                        if (node.id === null) {
                            const parentNode = astPath.parentPath.node;
                            if (t.isVariableDeclarator(astPath.parentPath)) {
                                componentClassName = parentNode.id.name;
                            }
                            else {
                                componentClassName = '_TaroComponentClass';
                            }
                            astPath.replaceWith(t.classExpression(t.identifier(componentClassName), node.superClass, node.body, node.decorators || []));
                        }
                        else {
                            componentClassName = node.id.name;
                        }
                    }
                }
            }
        };
        const getComponentId = (componentName, node) => {
            const idAttrName = constants_1.MAP_FROM_COMPONENTNAME_TO_ID.get(componentName);
            return node.attributes.reduce((prev, attribute) => {
                if (prev)
                    return prev;
                const attrName = astConvert_1.convertAstExpressionToVariable(attribute.name);
                if (attrName === idAttrName)
                    return astConvert_1.convertAstExpressionToVariable(attribute.value);
                else
                    return false;
            }, false);
        };
        const getComponentRef = (node) => {
            return node.attributes.find(attribute => {
                return astConvert_1.convertAstExpressionToVariable(attribute.name) === 'ref';
            });
        };
        const createRefFunc = (componentId) => {
            return t.arrowFunctionExpression([t.identifier('ref')], t.blockStatement([
                astConvert_1.convertSourceStringToAstExpression(`this['__taroref_${componentId}'] = ref`)
            ]));
        };
        /**
         * 把namedExport换成defaultExport。应对情况：
         *
         *  - export function example () {}
         *  - export class example {}
         *  - export const example
         *  - export { example }
         */
        const replaceExportNamedToDefault = (astPath) => {
            if (!astPath)
                return;
            const node = astPath.node;
            if (t.isFunctionDeclaration(node.declaration)) {
                astPath.replaceWithMultiple([
                    node.declaration,
                    t.exportDefaultDeclaration(node.declaration.id)
                ]);
            }
            else if (t.isClassDeclaration(node.declaration)) {
                astPath.replaceWithMultiple([
                    node.declaration,
                    t.exportDefaultDeclaration(node.declaration.id)
                ]);
            }
            else if (t.isVariableDeclaration(node.declaration)) {
                const declarationId = node.declaration.declarations[0].id;
                if (t.isIdentifier(declarationId)) {
                    astPath.replaceWithMultiple([
                        node.declaration,
                        t.exportDefaultDeclaration(declarationId)
                    ]);
                }
            }
            else if (node.specifiers && node.specifiers.length) {
                astPath.replaceWithMultiple([
                    t.exportDefaultDeclaration(node.specifiers[0].local)
                ]);
            }
        };
        const defaultVisitor = {
            ClassExpression: ClassDeclarationOrExpression,
            ClassDeclaration: ClassDeclarationOrExpression,
            ImportDeclaration: {
                enter: (astPath) => {
                    const node = astPath.node;
                    const source = node.source;
                    const specifiers = node.specifiers;
                    if (source.value === '@tarojs/taro') {
                        importTaroNode = node;
                        specifiers.forEach(specifier => {
                            if (t.isImportDefaultSpecifier(specifier)) {
                                taroImportDefaultName = astConvert_1.convertAstExpressionToVariable(specifier.local);
                            }
                            else if (t.isImportSpecifier(specifier)) {
                                taroapiMap.set(astConvert_1.convertAstExpressionToVariable(specifier.local), astConvert_1.convertAstExpressionToVariable(specifier.imported));
                            }
                        });
                        source.value = '@tarojs/taro-h5';
                    }
                    else if (source.value === '@tarojs/redux') {
                        source.value = '@tarojs/redux-h5';
                    }
                    else if (source.value === '@tarojs/mobx') {
                        source.value = '@tarojs/mobx-h5';
                    }
                    else if (source.value === '@tarojs/components') {
                        importTaroComponentNode = node;
                        node.specifiers.forEach((specifier) => {
                            if (!t.isImportSpecifier(specifier))
                                return;
                            componentnameMap.set(astConvert_1.convertAstExpressionToVariable(specifier.local), astConvert_1.convertAstExpressionToVariable(specifier.imported));
                        });
                    }
                    else if (source.value === 'nervjs') {
                        importNervNode = node;
                    }
                    if (helper_1.isAliasPath(source.value, pathAlias)) {
                        source.value = this.transformToTempDir(helper_1.replaceAliasPath(filePath, source.value, pathAlias));
                    }
                    if (!helper_1.isNpmPkg(source.value)) {
                        if (helper_1.REG_SCRIPTS.test(source.value) || path.extname(source.value) === '') {
                            const absolutePath = path.resolve(filePath, '..', source.value);
                            const dirname = path.dirname(absolutePath);
                            const extname = path.extname(absolutePath);
                            const realFilePath = helper_1.resolveScriptPath(path.join(dirname, path.basename(absolutePath, extname)));
                            const removeExtPath = realFilePath.replace(path.extname(realFilePath), '');
                            source.value = helper_1.promoteRelativePath(path.relative(filePath, removeExtPath)).replace(/\\/g, '/');
                        }
                    }
                }
            },
            JSXElement: {
                exit(astPath) {
                    hasJSX = true;
                }
            },
            JSXOpeningElement: {
                exit(astPath) {
                    const node = astPath.node;
                    const tagName = astConvert_1.convertAstExpressionToVariable(node.name);
                    const componentName = componentnameMap.get(tagName);
                    const componentId = getComponentId(componentName, node);
                    const componentRef = getComponentRef(node);
                    if (tagName === BLOCK_TAG_NAME) {
                        node.name = t.jSXMemberExpression(t.jSXIdentifier('Nerv'), t.jSXIdentifier('Fragment'));
                    }
                    if (!componentId)
                        return;
                    const refFunc = createRefFunc(componentId);
                    if (componentRef) {
                        const expression = componentRef.value.expression;
                        refFunc.body.body.unshift(t.expressionStatement(t.callExpression(expression, [t.identifier('ref')])));
                        componentRef.value.expression = refFunc;
                    }
                    else {
                        node.attributes.push(t.jSXAttribute(t.jSXIdentifier('ref'), t.jSXExpressionContainer(refFunc)));
                    }
                }
            },
            JSXClosingElement: {
                exit(astPath) {
                    const node = astPath.node;
                    const tagName = astConvert_1.convertAstExpressionToVariable(node.name);
                    if (tagName === BLOCK_TAG_NAME) {
                        node.name = t.jSXMemberExpression(t.jSXIdentifier('Nerv'), t.jSXIdentifier('Fragment'));
                    }
                }
            },
            CallExpression: {
                exit(astPath) {
                    const node = astPath.node;
                    const callee = node.callee;
                    const calleeName = astConvert_1.convertAstExpressionToVariable(callee);
                    let needToAppendThis = false;
                    let funcName = '';
                    const arg0 = node.arguments[0];
                    if (calleeName === 'require' && t.isStringLiteral(arg0)) {
                        const required = arg0.value;
                        if (required === '@tarojs/taro-h5') {
                            arg0.value = `@tarojs/taro-h5/dist/index.cjs.js`;
                        }
                    }
                    else if (t.isMemberExpression(callee)) {
                        const objName = astConvert_1.convertAstExpressionToVariable(callee.object);
                        const tmpFuncName = astConvert_1.convertAstExpressionToVariable(callee.property);
                        if (objName === taroImportDefaultName && constants_1.APIS_NEED_TO_APPEND_THIS.has(tmpFuncName)) {
                            needToAppendThis = true;
                            funcName = tmpFuncName;
                        }
                    }
                    else if (t.isIdentifier(callee)) {
                        const tmpFuncName = astConvert_1.convertAstExpressionToVariable(callee);
                        const oriFuncName = taroapiMap.get(tmpFuncName);
                        if (constants_1.APIS_NEED_TO_APPEND_THIS.has(oriFuncName)) {
                            needToAppendThis = true;
                            funcName = oriFuncName;
                        }
                    }
                    if (needToAppendThis) {
                        const thisOrder = constants_1.APIS_NEED_TO_APPEND_THIS.get(funcName);
                        if (thisOrder && !node.arguments[thisOrder]) {
                            node.arguments[thisOrder] = t.thisExpression();
                        }
                    }
                }
            },
            AssignmentExpression(astPath) {
                const node = astPath.node;
                const left = node.left;
                if (t.isMemberExpression(left) && t.isIdentifier(left.object)) {
                    if (left.object.name === componentClassName
                        && t.isIdentifier(left.property)
                        && left.property.name === 'config') {
                        needSetConfigFromHooks = true;
                        configFromHooks = node.right;
                        pageConfig = astConvert_1.convertAstExpressionToVariable(node.right);
                    }
                }
            },
            Program: {
                exit(astPath) {
                    const node = astPath.node;
                    if (hasJSX) {
                        if (!importNervNode) {
                            importNervNode = t.importDeclaration([t.importDefaultSpecifier(t.identifier(constants_1.nervJsImportDefaultName))], t.stringLiteral('nervjs'));
                            const specifiers = importNervNode.specifiers;
                            const defaultSpecifier = specifiers.find(item => t.isImportDefaultSpecifier(item));
                            if (!defaultSpecifier) {
                                specifiers.unshift(t.importDefaultSpecifier(t.identifier(constants_1.nervJsImportDefaultName)));
                            }
                            node.body.unshift(importNervNode);
                        }
                        if (!importTaroNode) {
                            importTaroNode = t.importDeclaration([t.importDefaultSpecifier(t.identifier('Taro'))], t.stringLiteral('@tarojs/taro-h5'));
                            node.body.unshift(importTaroNode);
                        }
                        astPath.traverse({
                            ClassBody(astPath) {
                                if (needSetConfigFromHooks) {
                                    const classPath = astPath.findParent((p) => p.isClassExpression() || p.isClassDeclaration());
                                    classPath.node.body.body.unshift(t.classProperty(t.identifier('config'), configFromHooks));
                                }
                            }
                        });
                    }
                }
            }
        };
        const pageVisitor = {
            ClassProperty: {
                enter(astPath) {
                    const node = astPath.node;
                    const key = astConvert_1.convertAstExpressionToVariable(node.key);
                    if (key === 'config') {
                        pageConfig = astConvert_1.convertAstExpressionToVariable(node.value);
                    }
                }
            },
            ClassMethod: {
                exit(astPath) {
                    const node = astPath.node;
                    const key = node.key;
                    const keyName = astConvert_1.convertAstExpressionToVariable(key);
                    if (keyName === 'componentDidMount') {
                        componentDidMountNode = node;
                    }
                    else if (keyName === 'componentDidShow') {
                        componentDidShowNode = node;
                    }
                    else if (keyName === 'componentDidHide') {
                        componentDidHideNode = node;
                    }
                    else if (keyName === 'onPageScroll') {
                        hasOnPageScroll = true;
                    }
                    else if (keyName === 'onReachBottom') {
                        hasOnReachBottom = true;
                    }
                    else if (keyName === 'onPullDownRefresh') {
                        hasOnPullDownRefresh = true;
                    }
                    else if (keyName === 'render') {
                        renderReturnStatementPaths.length = 0;
                        renderClassMethodNode = node;
                        astPath.traverse({
                            ReturnStatement: {
                                exit(returnAstPath) {
                                    renderReturnStatementPaths.push(returnAstPath);
                                }
                            }
                        });
                    }
                }
            },
            ClassBody: {
                exit(astPath) {
                    const node = astPath.node;
                    if (!componentDidMountNode) {
                        componentDidMountNode = t.classMethod('method', t.identifier('componentDidMount'), [], t.blockStatement([
                            astConvert_1.convertSourceStringToAstExpression('super.componentDidMount && super.componentDidMount()')
                        ]), false, false);
                        node.body.push(componentDidMountNode);
                    }
                    if (!componentDidShowNode) {
                        componentDidShowNode = t.classMethod('method', t.identifier('componentDidShow'), [], t.blockStatement([
                            astConvert_1.convertSourceStringToAstExpression('super.componentDidShow && super.componentDidShow()')
                        ]), false, false);
                        node.body.push(componentDidShowNode);
                    }
                    if (!componentDidHideNode) {
                        componentDidHideNode = t.classMethod('method', t.identifier('componentDidHide'), [], t.blockStatement([
                            astConvert_1.convertSourceStringToAstExpression('super.componentDidHide && super.componentDidHide()')
                        ]), false, false);
                        node.body.push(componentDidHideNode);
                    }
                    if (hasOnReachBottom) {
                        componentDidShowNode.body.body.push(astConvert_1.convertSourceStringToAstExpression(`
                this._offReachBottom = Taro.onReachBottom({
                  callback: this.onReachBottom,
                  ctx: this,
                  onReachBottomDistance: ${JSON.stringify(pageConfig.onReachBottomDistance)}
                })
              `));
                        componentDidHideNode.body.body.push(astConvert_1.convertSourceStringToAstExpression('this._offReachBottom && this._offReachBottom()'));
                    }
                    if (hasOnPageScroll) {
                        componentDidShowNode.body.body.push(astConvert_1.convertSourceStringToAstExpression('this._offPageScroll = Taro.onPageScroll({ callback: this.onPageScroll, ctx: this })'));
                        componentDidHideNode.body.body.push(astConvert_1.convertSourceStringToAstExpression('this._offPageScroll && this._offPageScroll()'));
                    }
                    if (hasOnPullDownRefresh) {
                        componentDidShowNode.body.body.push(astConvert_1.convertSourceStringToAstExpression(`
                this.pullDownRefreshRef && this.pullDownRefreshRef.bindEvent()
              `));
                        componentDidHideNode.body.body.push(astConvert_1.convertSourceStringToAstExpression(`
                this.pullDownRefreshRef && this.pullDownRefreshRef.unbindEvent()
              `));
                    }
                }
            },
            ExportDefaultDeclaration: {
                exit(astPath) {
                    exportDefaultDeclarationNode = astPath.node;
                }
            },
            ExportNamedDeclaration: {
                exit(astPath) {
                    exportNamedDeclarationPath = astPath;
                }
            },
            Program: {
                exit(astPath) {
                    if (hasOnPullDownRefresh) {
                        // 增加PullDownRefresh组件
                        if (!importTaroComponentNode) {
                            importTaroComponentNode = t.importDeclaration([], t.stringLiteral('@tarojs/components'));
                            astPath.node.body.unshift(importTaroComponentNode);
                        }
                        const specifiers = importTaroComponentNode.specifiers;
                        const pos = importTaroComponentNode.specifiers.findIndex(specifier => {
                            if (!t.isImportSpecifier(specifier))
                                return false;
                            const importedComponent = astConvert_1.convertAstExpressionToVariable(specifier.imported);
                            return importedComponent === 'PullDownRefresh';
                        });
                        if (pos === -1) {
                            specifiers.push(t.importSpecifier(t.identifier('PullDownRefresh'), t.identifier('PullDownRefresh')));
                        }
                        const returnStatement = renderReturnStatementPaths.filter(renderReturnStatementPath => {
                            const funcParentPath = renderReturnStatementPath.getFunctionParent();
                            return funcParentPath.node === renderClassMethodNode;
                        });
                        returnStatement.forEach(returnAstPath => {
                            const statement = returnAstPath.node;
                            const varName = returnAstPath.scope.generateUid();
                            const returnValue = statement.argument;
                            const pullDownRefreshNode = t.variableDeclaration('const', [t.variableDeclarator(t.identifier(varName), returnValue)]);
                            returnAstPath.insertBefore(pullDownRefreshNode);
                            statement.argument = astConvert_1.convertSourceStringToAstExpression(`
                <PullDownRefresh
                  onRefresh={this.onPullDownRefresh && this.onPullDownRefresh.bind(this)}
                  ref={ref => {
                    if (ref) this.pullDownRefreshRef = ref
                }}>{${varName}}</PullDownRefresh>`).expression;
                        });
                    }
                    if (!exportDefaultDeclarationNode && exportNamedDeclarationPath) {
                        replaceExportNamedToDefault(exportNamedDeclarationPath);
                    }
                }
            }
        };
        const visitor = helper_1.mergeVisitors({}, defaultVisitor, isPage ? pageVisitor : {});
        babel_traverse_1.default(ast, visitor);
        const generateCode = better_babel_generator_1.default(ast, {
            jsescOption: {
                minimal: true
            }
        }).code;
        return generateCode;
    }
    getTempDir(filePath, originalFilePath) {
        const appPath = this.appPath;
        const sourcePath = this.sourcePath;
        const tempDir = this.tempDir;
        let dirname = path.dirname(filePath);
        if (filePath.indexOf(sourcePath) < 0) {
            dirname = path.extname(originalFilePath) ? path.dirname(originalFilePath) : originalFilePath;
        }
        const relPath = path.relative(sourcePath, dirname);
        return path.resolve(appPath, tempDir, relPath);
    }
    transformToTempDir(filePath) {
        const sourcePath = this.sourcePath;
        const isAbsolute = path.isAbsolute(filePath);
        if (!isAbsolute)
            return filePath;
        const relPath = path.relative(sourcePath, filePath);
        return relPath.startsWith('..')
            ? filePath
            : path.resolve(this.tempPath, relPath);
    }
    processFiles(filePath, originalFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const h5Path = filePath.replace(/(?<!\.h5)(\.[\da-z]+)$/ig, '.h5$1');
            const hasH5 = yield fs.pathExists(h5Path);
            const original = fs.readFileSync(hasH5 ? h5Path : filePath, { encoding: 'utf8' });
            const extname = path.extname(filePath);
            const distDirname = this.getTempDir(filePath, originalFilePath);
            const isScriptFile = helper_1.REG_SCRIPTS.test(extname);
            const distPath = this.getDist(distDirname, filePath.replace(/\.h5(\.[\da-z]+)$/ig, '$1'), isScriptFile);
            fs.ensureDirSync(distDirname);
            try {
                if (isScriptFile) {
                    // 脚本文件 处理一下
                    const fileType = this.classifyFiles(filePath);
                    if (fileType === constants_1.FILE_TYPE.ENTRY) {
                        this.pages = [];
                        const result = this.processEntry(original, filePath);
                        if (Array.isArray(result)) {
                            result.forEach(([pageName, code]) => {
                                pageName = pageName.replace(/\.h5$/ig, '');
                                fs.writeFileSync(path.join(distDirname, `${pageName}.js`), code);
                            });
                        }
                        else {
                            fs.writeFileSync(distPath, result);
                        }
                    }
                    else {
                        const code = this.processOthers(original, filePath, fileType);
                        fs.writeFileSync(distPath, code);
                    }
                }
                else {
                    // 其他 直接复制
                    fs.copySync(filePath, distPath);
                }
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    getDist(distDirname, filename, isScriptFile) {
        return isScriptFile
            ? path.format({
                dir: distDirname,
                ext: '.js',
                name: path.basename(filename, path.extname(filename))
            })
            : path.format({
                dir: distDirname,
                base: path.basename(filename)
            });
    }
}
exports.Compiler = Compiler;
function build(appPath, buildConfig, buildHooks) {
    return __awaiter(this, void 0, void 0, function* () {
        process.env.TARO_ENV = 'h5';
        yield util_1.checkCliAndFrameworkVersion(appPath, 'h5');
        const compiler = new Compiler(appPath);
        yield compiler.clean();
        yield compiler.buildTemp();
        if (compiler.h5Config.transformOnly !== true) {
            yield compiler.buildDist(buildConfig, buildHooks);
        }
        if (buildConfig.watch) {
            compiler.watchFiles();
        }
    });
}
exports.build = build;
