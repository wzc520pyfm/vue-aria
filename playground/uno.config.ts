import {defineConfig} from 'unocss'
import {presetNevUI} from '@nev-ui/preset'

export default defineConfig({
  presets: [
    presetNevUI({
      /* preset options */
    }),
  ],
  configDeps: [
    '../packages/preset/dist/index.js',
    '../packages/@preset/system/dist/index.js',
    '../packages/@preset/button/dist/index.js',
  ]
})
