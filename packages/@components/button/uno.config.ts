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
}) as UserConfig<Theme>
