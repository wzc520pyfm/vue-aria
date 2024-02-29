import {definePreset} from '@unocss/core'
import {presetNevUIButton} from '@nev-ui/preset-button'
import type {PresetNevUISystemOptions, Theme} from '@nev-ui/preset-system'

export type {Theme}

export interface PresetNevUIOptions extends PresetNevUISystemOptions {}

export const presetNevUI = definePreset((options: PresetNevUIOptions = {}) => {
  return {
    ...presetNevUIButton(options),
    // and other presets
    name: '@nev-ui/preset',
  }
})

export default presetNevUI
