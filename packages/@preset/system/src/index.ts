import {definePreset} from '@unocss/core'
import {presetMini} from '@unocss/preset-mini'
import presetTheme from 'unocss-preset-theme'
import {all as deepMergeAll} from 'deepmerge'
import {get, omit} from 'radash'
import {nevui} from './plugin'
import type {Theme} from './plugin'
import type {PresetMiniOptions} from '@unocss/preset-mini'

export type {Theme}

export interface PresetNevUISystemOptions extends PresetMiniOptions {
  theme?: Record<string, Theme>
}

export const presetNevUISystem = definePreset((options: PresetNevUISystemOptions = {}) => {
  const {theme} = nevui(options)
  const lightTheme = get(theme, 'light', {})
  const otherTheme = omit(theme, ['light']) || {}
  const preset = {
    name: '@nev-ui/preset-system',
    theme: lightTheme,
    // and other custom configurations
  }

  return deepMergeAll([
    presetMini(options),
    presetTheme<Theme>({prefix: '--nevui', theme: otherTheme}),
    preset,
  ])
})

export default presetNevUISystem
