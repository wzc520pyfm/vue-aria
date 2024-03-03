import {definePreset} from '@unocss/core'
import {presetNevUISystem} from '@nev-ui/preset-system'
import type {PresetNevUISystemOptions, Theme} from '@nev-ui/preset-system'

export type {Theme}

export const presetNevUIButton = definePreset((options: PresetNevUISystemOptions = {}) => {
  return {
    ...presetNevUISystem(options),
    name: '@nev-ui/preset-button',
    // and other custom configurations
    shortcuts: [
      {
        btn: 'bg-blue-400 text-white px-20px py-12px text-14px cursor-pointer inline-block border-0 rounded-3em line-height-none',
      },
    ],
    autocomplete: {
      shorthands: {
        btn: 'btn',
      },
    },
  }
})

export default presetNevUIButton
