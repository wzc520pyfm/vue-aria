import {get, omit} from 'radash'
import forEach from 'lodash.foreach'
import deepMerge from 'deepmerge'
import {semanticColors} from './colors'
import {isBaseTheme} from './utils/theme'
import {darkLayout, defaultLayout, lightLayout} from './default-layout'
import {animation} from './animations'
import type {Theme} from '@unocss/preset-wind'
import type {ConfigThemes, DefaultThemeType, LayoutTheme} from './types'

export {Theme}

interface NevUIPlugin {
  // userTheme
  theme?: ConfigThemes
  defaultExtendTheme?: DefaultThemeType
  layout?: LayoutTheme
}

export const nevui = (config: NevUIPlugin = {}) => {
  const {theme: themeObject = {}, defaultExtendTheme = 'light', layout: userLayout} = config

  const userLightColors = get(themeObject, 'light.colors', {})
  const userDarkColors = get(themeObject, 'dark.colors', {})

  const defaultLayoutObj =
    userLayout && typeof userLayout === 'object'
      ? deepMerge(defaultLayout, userLayout)
      : defaultLayout

  const baseLayouts = {
    light: {
      ...defaultLayoutObj,
      ...lightLayout,
    },
    dark: {
      ...defaultLayoutObj,
      ...darkLayout,
    },
  }

  // get other theme from the config different from light and dark
  const otherTheme = omit(themeObject, ['light', 'dark']) || {}

  forEach(otherTheme, ({extend, colors, layout}, themeName) => {
    const baseTheme = extend && isBaseTheme(extend) ? extend : defaultExtendTheme

    if (colors && typeof colors === 'object') {
      otherTheme[themeName].colors = deepMerge(semanticColors[baseTheme], colors)
    }
    if (layout && typeof layout === 'object') {
      otherTheme[themeName] = {
        ...deepMerge(extend ? baseLayouts[extend] : defaultLayoutObj, layout),
        colors: otherTheme[themeName].colors,
      }
    }
  })

  const light: Theme = {
    ...deepMerge(baseLayouts.light, get(themeObject, 'light.layout', {})),
    colors: deepMerge(semanticColors.light, userLightColors),
    animation,
  }

  const dark: Theme = {
    ...deepMerge(baseLayouts.dark, get(themeObject, 'dark.layout', {})),
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
