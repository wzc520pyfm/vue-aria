import {defineComponent, h, inject} from 'vue'
import {KeyboardContextKey} from './context'

export interface KeyboardProps {}

export const Keyboard = defineComponent({
  name: 'Keyboard',
  inheritAttrs: false,
  setup(_props, {slots, attrs}) {
    const ctx = inject(KeyboardContextKey, undefined)
    return () => h('kbd', {dir: 'ltr', ...(ctx ?? {}), ...attrs}, slots.default?.())
  },
})
