import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import {buttonShortcuts, getButtonSafeList} from './shortcuts'
import type {PresetNevUISystemOptions, Theme} from '@nev-ui/preset-system'

export type {Theme}

export const presetNevUIButton = definePreset((options: PresetNevUISystemOptions = {}) => {
  return {
    ...presetNevUISystem(options),
    name: '@nev-ui/preset-button',
    // and other custom configurations
    // ...
    shortcuts: buttonShortcuts,
    safelist: getButtonSafeList(),
  }
})

export default presetNevUIButton
