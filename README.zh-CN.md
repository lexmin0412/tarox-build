# Taro Build Scripts

中文 | [English](https://github.com/lexmin0412/tarox-build#readme)

一个 taro 构建脚本，fork 自 [@tarojs/cli](https://github.com/NervJS/taro)。

## 安装

```bash
$npm i @tarox/build -D
```

## 使用

将 build 脚本替换成如下的内容，你就不必在 taro 项目中将 `@tarojs/cli` 加入 devdependencies 来保证 cli 与运行时相关依赖（如 @tarojs/taro-weapp）的版本一致了。

```zsh
$npx tarox-build build --type weapp
```
