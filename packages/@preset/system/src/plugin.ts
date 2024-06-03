import {get, omit} from 'radash'
import forEach from 'lodash.foreach'
import deepMerge from 'deepmerge'
import {semanticColors} from './colors'
import {isBaseTheme} from './utils/theme'
import type {Theme as PresetMiniTheme} from '@unocss/preset-wind'

export interface Theme extends PresetMiniTheme {
  extend?: string
}

interface NevUIPlugin {
  // userTheme
  theme?: Record<string, Theme>
  defaultExtendTheme?: 'light' | 'dark'
}

export const nevui = (config: NevUIPlugin = {}) => {
  const {theme: themeObject = {}, defaultExtendTheme = 'light'} = config

  const userLightColors = get(themeObject, 'light.colors', {})
  const userDarkColors = get(themeObject, 'dark.colors', {})
  // TODO: merge more default config

  // get other theme from the config different from light and dark
  const otherTheme = omit(themeObject, ['light', 'dark']) || {}

  forEach(otherTheme, ({extend, colors}, themeName) => {
    const baseTheme = extend && isBaseTheme(extend) ? extend : defaultExtendTheme

    // TODO: just merge the colors for now
    if (colors && typeof colors === 'object') {
      otherTheme[themeName].colors = deepMerge(semanticColors[baseTheme], colors)
    }
  })

  const light: Theme = {
    ...get(themeObject, 'light', {}),
    colors: deepMerge(semanticColors.light, userLightColors),
  }

  const dark: Theme = {
    ...get(themeObject, 'dark', {}),
    colors: deepMerge(semanticColors.dark, userDarkColors),
  }

  const theme = {
    light,
    dark,
    ...otherTheme,
  }

  return {
    theme,
  }
}
