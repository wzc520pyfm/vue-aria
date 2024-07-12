import {definePreset} from '@unocss/core'
import presetWind from '@unocss/preset-wind'
// waiting for fix
// import presetTheme from 'unocss-preset-theme'
import {all as deepMergeAll} from 'deepmerge'
import {get, omit} from 'radash'
// TODO: temporary solution, the `unocss-preset-theme` has bug
import presetTheme from './pre-theme'
import {nevui} from './plugin'
import {commonAnimationShortcuts} from './animations'
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
  const preset: Preset<Theme> = {
    name: '@nev-ui/preset-system',
    theme: defaultTheme,
    shortcuts: [commonAnimationShortcuts],
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
