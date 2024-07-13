import {resolve} from 'node:path'
import {defineConfig} from 'unocss'
import {presetNevUISpinner} from '@nev-ui/preset-spinner'
import {getSubDirNames} from '@nev-ui/build-utils'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset-spinner'

const presetDir = resolve(__dirname, '../../@preset')
const presetNames = getSubDirNames(presetDir)

export default defineConfig<Theme>({
  presets: [
    presetNevUISpinner({
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
