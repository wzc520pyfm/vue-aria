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
        // btn: 'bg-blue-400 text-white px-20px py-12px text-14px cursor-pointer inline-block border-0 rounded-3em line-height-none',
        'btn-base':
          'border-0 z-0 relative inline-flex items-center justify-center box-border appearance-none outline-none select-none whitespace-nowrap min-w-max font-normal subpixel-antialiased overflow-hidden',
        btn: 'btn-base btn-md btn-default btn-rounded-md',
        'btn-sm': 'px-3 min-w-16 h-8 text-xs gap-2 rounded-sm',
        'btn-md': 'px-4 min-w-20 h-10 text-sm gap-2 rounded-md',
        'btn-lg': 'px-6 min-w-24 h-12 text-base gap-3 rounded-lg',
        'btn-default': 'bg-#d4d4d8 text-#11181C', // color should has a system
        'btn-primary': 'bg-#006FEE text-#FFFFFF',
        // more colors
        // ...
        'btn-rounded-none': 'rounded-none',
        'btn-rounded-sm': 'rounded-sm',
        'btn-rounded-md': 'rounded-md',
        'btn-rounded-lg': 'rounded-lg',
        'btn-rounded-full': 'rounded-full',
      },
    ],
    safelist: [
      'btn',
      'btn-sm',
      'btn-md',
      'btn-lg',
      'btn-default',
      'btn-primary',
      'btn-rounded-none',
      'btn-rounded-sm',
      'btn-rounded-md',
      'btn-rounded-lg',
      'btn-rounded-full',
    ],
  }
})

export default presetNevUIButton
