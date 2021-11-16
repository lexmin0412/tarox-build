import * as path from 'path'

import * as minimist from 'minimist'
import { Kernel } from '@tarojs/service'

import build from './commands/build'

export default class CLI {
  appPath: string
  constructor (appPath?: string) {
    this.appPath = appPath || process.cwd()
  }

  run () {
    // this.parseArgs()
		const args = minimist(process.argv.slice(2), {
			alias: {
				version: ['v'],
				help: ['h']
			},
			boolean: ['version', 'help']
		})
		const kernel = new Kernel({
			appPath: this.appPath,
			presets: [
				path.resolve(__dirname, '.', 'presets', 'index.js')
			]
		})
		build(kernel, {
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
		})
  }
}
