import { resolve } from 'node:path'
import fs from 'fs-extra'
import { defineConfig } from 'unocss'
import { presetNevUI } from '@nev-ui/preset'

const presetDir = resolve(__dirname, '../packages/@preset')
const presetNames = getSubDirNames(presetDir)

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

function getSubDirNames(dir: string) {
  return fs
    .readdirSync(dir, {withFileTypes: true})
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}
