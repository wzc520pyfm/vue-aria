import {resolve} from 'node:path'
import {getSubDirNames} from '@nev-ui/shared'
import {defineConfig} from 'unocss'
import {presetNevUI} from '@nev-ui/preset'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset'

const presetDir = resolve(__dirname, '../@preset')
const presetNames = getSubDirNames(presetDir)

export default defineConfig<Theme>({
  presets: [
    presetNevUI({
      /* preset options */
    }),
  ],
  configDeps: [
    '../preset/dist/index.js',
    ...presetNames.map((name) => `../@preset/${name}/dist/index.js`),
  ],
}) as UserConfig<Theme>
