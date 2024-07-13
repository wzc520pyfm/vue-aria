import {resolve} from 'node:path'
import {defineConfig} from 'unocss'
import {presetNevUIButton} from '@nev-ui/preset-button'
import {getSubDirNames} from '@nev-ui/build-utils'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset-button'

const presetDir = resolve(__dirname, '../../@preset')
const presetNames = getSubDirNames(presetDir)

export default defineConfig<Theme>({
  presets: [
    presetNevUIButton({
      /* preset options */
    }),
  ],
  content: {
    pipeline: {
      include: [/\.(ts|vue)($|\?)/],
    },
  },
  configDeps: [
    '../../preset/dist/index.js',
    ...presetNames.map((name) => `../../@preset/${name}/dist/index.js`),
  ],
}) as UserConfig<Theme>
