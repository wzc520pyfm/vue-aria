import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import deepMerge from 'deepmerge'
import {buttonShortcuts, getButtonSafeList} from './shortcuts'
import type {Layout, PresetNevUISystemOptions, Theme, Themes} from '@nev-ui/preset-system'

export type {Theme, Themes, Layout}

export const presetNevUIButton = definePreset((options: PresetNevUISystemOptions = {}) => {
  const preset = {
    name: '@nev-ui/preset-button',
    // and other custom configurations
    // ...
    shortcuts: buttonShortcuts,
    safelist: getButtonSafeList(),
  }

  return deepMerge(presetNevUISystem(options), preset)
})

export default presetNevUIButton
