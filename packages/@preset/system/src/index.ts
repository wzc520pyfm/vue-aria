import {definePreset} from '@unocss/core'
import presetWind from '@unocss/preset-wind'
import presetTheme from 'unocss-preset-theme'
import {all as deepMergeAll} from 'deepmerge'
import {get, omit} from 'radash'
import {nevui} from './plugin'
import type {Preset} from '@unocss/core'
import type {ConfigTheme, ConfigThemes, LayoutTheme} from './types'
import type {Theme} from './plugin'

export {ConfigTheme as Theme, ConfigThemes as Themes, LayoutTheme as Layout}

export interface PresetNevUISystemOptions {
  layout?: LayoutTheme
  theme?: ConfigThemes
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

  return deepMergeAll<Preset<Theme>>([
    presetWind(options),
    presetTheme<Theme>({prefix: '--nevui', theme: otherTheme}),
    preset,
  ])
})

export default presetNevUISystem
