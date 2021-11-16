# Taro Build Scripts

English | [中文](https://github.com/lexmin0412/tarox-build/blob/master/README.zh-CN.md)

A taro build script forked from [@tarojs/cli](https://github.com/NervJS/taro)。

## Installation

```bash
$npm i @tarox/build -D
```

## Usage

replace build script with content below, you don't need to add `@tarojs/cli` into your devdependencies to maintain the consistence between cli and runtime dependencies anymore.

```json
// package.json
{
	"scripts": {
		"build": "npx tarox-build build --type weapp"
	}
}
```

