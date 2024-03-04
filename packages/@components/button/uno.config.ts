import {defineConfig} from 'unocss'
import {presetNevUIButton} from '@nev-ui/preset-button'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset-button'

export default defineConfig<Theme>({
  presets: [
    presetNevUIButton({
      /* preset options */
    }),
  ],
  configDeps: [
    '../../preset/dist/index.js',
    '../../@preset/system/dist/index.js',
    '../../@preset/button/dist/index.js',
  ],
}) as UserConfig<Theme>
