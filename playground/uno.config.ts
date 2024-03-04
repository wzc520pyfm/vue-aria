import { resolve } from 'node:path'
import fs from 'fs-extra'
import { defineConfig } from 'unocss'
import { presetNevUI } from '@nev-ui/preset'

const presetDir = resolve(__dirname, '../packages/@preset')
const presetNames = fs
  .readdirSync(presetDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

export default defineConfig({
  presets: [
    presetNevUI({
      /* preset options */
    })
  ],
  configDeps: [
    '../packages/preset/dist/index.js',
    ...presetNames.map((name) => `../packages/@preset/${name}/dist/index.js`)
  ]
})
