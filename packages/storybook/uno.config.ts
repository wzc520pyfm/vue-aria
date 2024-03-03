import {defineConfig} from 'unocss'
import {presetNevUI} from '@nev-ui/preset'
import type {UserConfig} from 'unocss'
import type {Theme} from '@nev-ui/preset'

export default defineConfig<Theme>({
  presets: [
    presetNevUI({
      /* preset options */
    }),
  ],
}) as UserConfig<Theme>
