import {resolve} from 'node:path'
import fs from 'fs-extra'
import {defineConfig} from 'unocss'
import {presetNevUIButton} from '@nev-ui/preset-button'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset-button'

const presetDir = resolve(__dirname, '../../@preset')
const presetNames = fs
  .readdirSync(presetDir, {withFileTypes: true})
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

export default defineConfig<Theme>({
  presets: [
    presetNevUIButton({
      /* preset options */
    }),
  ],
  configDeps: [
    '../../preset/dist/index.js',
    ...presetNames.map((name) => `../../@preset/${name}/dist/index.js`),
  ],
}) as UserConfig<Theme>
