import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import deepMerge from 'deepmerge'
import {getUISafeList, uiShortcuts} from './shortcuts'
import type {Preset} from '@unocss/core'
import type {Layout, PresetNevUISystemOptions, Theme, Themes} from '@nev-ui/preset-system'

export type {Theme, Themes, Layout}

export interface PresetNevUIOptions extends PresetNevUISystemOptions {}

export const presetNevUI = definePreset((options: PresetNevUIOptions = {}) => {
  const preset: Preset<Theme> = {
    name: '@nev-ui/preset',
    // and other custom configurations
    shortcuts: uiShortcuts,
    safelist: getUISafeList(),
  }

  return deepMerge(presetNevUISystem(options), preset)
})

export default presetNevUI
