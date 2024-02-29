import {definePreset} from '@unocss/core'
import {presetMini} from '@unocss/preset-mini'
import type {PresetMiniOptions, Theme} from '@unocss/preset-mini'

export type {Theme}

export interface PresetNevUISystemOptions extends PresetMiniOptions {}

export const presetNevUISystem = definePreset((options: PresetNevUISystemOptions = {}) => {
  return {
    ...presetMini(options),
    name: '@nev-ui/preset-system',
    // and other custom configurations
  }
})

export default presetNevUISystem
