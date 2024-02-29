import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import type {PresetNevUISystemOptions, Theme} from '@nev-ui/preset-system'

export type {Theme}

export const presetNevUIButton = definePreset((options: PresetNevUISystemOptions = {}) => {
  return {
    ...presetNevUISystem(options),
    name: '@nev-ui/preset-button',
    // and other custom configurations
  }
})

export default presetNevUIButton
