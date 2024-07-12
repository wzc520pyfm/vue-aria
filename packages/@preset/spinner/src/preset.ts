import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import deepMerge from 'deepmerge'
import {getSpinnerSafeList, spinnerShortcuts} from './shortcuts'
import type {PresetFactory} from '@unocss/core'
import type {Layout, PresetNevUISystemOptions, Theme, Themes} from '@nev-ui/preset-system'

export type {Theme, Themes, Layout}

export const presetNevUISpinner: PresetFactory<Theme, PresetNevUISystemOptions> = definePreset(
  (options: PresetNevUISystemOptions = {}) => {
    const preset = {
      name: '@nev-ui/preset-spinner',
      // and other custom configurations
      // ...
      shortcuts: spinnerShortcuts,
      safelist: getSpinnerSafeList(),
    }

    return deepMerge(presetNevUISystem(options), preset)
  },
)

export default presetNevUISpinner
