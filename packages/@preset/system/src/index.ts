import {definePreset} from '@unocss/core'
import presetWind from '@unocss/preset-wind'
import presetTheme from 'unocss-preset-theme'
import {all as deepMergeAll} from 'deepmerge'
import {get, omit} from 'radash'
import {nevui} from './plugin'
import type {Preset} from '@unocss/core'
import type {ConfigTheme, ConfigThemes, DefaultThemeType, LayoutTheme} from './types'
import type {Theme} from './plugin'

export {ConfigTheme as Theme, ConfigThemes as Themes, LayoutTheme as Layout}

export interface PresetNevUISystemOptions {
  layout?: LayoutTheme
  theme?: ConfigThemes
  defaultTheme?: DefaultThemeType
}

export const presetNevUISystem = definePreset((options: PresetNevUISystemOptions = {}) => {
  const {defaultTheme: defaultThemeType = 'light', ...otherOptions} = options
  const {theme} = nevui(otherOptions)

  const defaultTheme = get(theme, defaultThemeType, {})
  const otherTheme = omit(theme, [defaultThemeType]) || {}
  const preset = {
    name: '@nev-ui/preset-system',
    theme: defaultTheme,
    // and other custom configurations
  }

  return deepMergeAll<Preset<Theme>>([
    presetWind(),
    presetTheme<Theme>({
      prefix: '--nevui',
      theme: otherTheme,
      selectors: {
        [defaultThemeType]: `:root, .${defaultThemeType}`,
        ...Object.fromEntries(Object.keys(otherTheme).map((name) => [name, `.${name}`])),
      },
    }),
    preset,
  ])
})

export default presetNevUISystem
